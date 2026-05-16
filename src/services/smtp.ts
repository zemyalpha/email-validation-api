import * as net from 'net';
import { promises as dnsPromises } from 'dns';
import { SmtpCheckResult } from '../types.js';

export interface SmtpVerifyResult {
  exists: SmtpCheckResult;
  catchAll: boolean;
}

const SMTP_TIMEOUT_MS = 5000;
const FROM_DOMAIN = 'emailvalidation.local';

async function getMxHost(domain: string): Promise<string | null> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    if (!records.length) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0].exchange;
  } catch {
    return null;
  }
}

/**
 * Attempt a single SMTP RCPT TO probe against the given MX host.
 * Returns the numeric SMTP response code for the RCPT TO step,
 * or 0 if the connection failed or timed out (e.g. port 25 blocked).
 */
function probeSmtp(
  mxHost: string,
  rcptEmail: string,
  timeoutMs: number
): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(code);
    };

    const timer = setTimeout(() => settle(0), timeoutMs);
    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setEncoding('ascii');

    let buf = '';
    // step: 0=await banner, 1=await EHLO, 2=await MAIL FROM, 3=await RCPT TO
    let step = 0;

    socket.on('data', (chunk: string) => {
      buf += chunk;
      // Process every complete CRLF-terminated line in the buffer
      let crlf = buf.indexOf('\r\n');
      while (crlf !== -1) {
        const line = buf.slice(0, crlf);
        buf = buf.slice(crlf + 2);

        // Skip empty lines and SMTP multi-line continuations (e.g. "250-ENHANCEDSTATUSCODES")
        const isContinuation = line.length >= 4 && line[3] === '-';
        if (line && !isContinuation) {
          const code = parseInt(line.slice(0, 3), 10);
          if (!isNaN(code)) {
            switch (step) {
              case 0: // banner
                if (code === 220) {
                  step = 1;
                  socket.write(`EHLO ${FROM_DOMAIN}\r\n`);
                } else {
                  settle(0);
                }
                break;
              case 1: // EHLO response
                if (code === 250 || code === 220) {
                  step = 2;
                  socket.write('MAIL FROM:<>\r\n');
                } else {
                  settle(0);
                }
                break;
              case 2: // MAIL FROM response
                if (code === 250) {
                  step = 3;
                  socket.write(`RCPT TO:<${rcptEmail}>\r\n`);
                } else {
                  settle(0);
                }
                break;
              case 3: // RCPT TO response — this is what we care about
                socket.write('QUIT\r\n');
                settle(code);
                break;
            }
          }
        }

        crlf = buf.indexOf('\r\n');
      }
    });

    socket.on('error', () => settle(0));
    socket.on('timeout', () => settle(0));
    socket.setTimeout(timeoutMs);
  });
}

/**
 * Verify email deliverability via SMTP and detect catch-all domains.
 *
 * How it works:
 *  1. Look up the domain's lowest-priority MX record.
 *  2. Open two parallel SMTP sessions to that MX server on port 25:
 *     - One with the real email address.
 *     - One with a provably random address (catch-all probe).
 *  3. Parse the RCPT TO response codes:
 *     - 250 = accepted (deliverable / catch-all)
 *     - 550-559 = rejected (undeliverable)
 *     - anything else = unknown (port blocked, timeout, greylisting, etc.)
 *
 * Returns 'unknown' when SMTP is unavailable — common in cloud environments
 * where ISPs block outbound port 25. The result is used as an additive
 * confidence signal and does not block the response if unavailable.
 */
export async function smtpVerify(
  email: string,
  domain: string,
  timeoutMs = SMTP_TIMEOUT_MS
): Promise<SmtpVerifyResult> {
  const mxHost = await getMxHost(domain);
  if (!mxHost) return { exists: 'unknown', catchAll: false };

  const probeLocal = `noprobe-${Math.random().toString(36).slice(2, 10)}`;
  const probeEmail = `${probeLocal}@${domain}`;

  // Half the budget per probe so both complete within the overall timeout
  const halfTimeout = Math.max(1500, Math.floor(timeoutMs / 2));

  const [actualCode, probeCode] = await Promise.all([
    probeSmtp(mxHost, email, halfTimeout).catch(() => 0),
    probeSmtp(mxHost, probeEmail, halfTimeout).catch(() => 0),
  ]);

  const catchAll = probeCode === 250;

  let exists: SmtpCheckResult;
  if (actualCode === 250) {
    exists = 'deliverable';
  } else if (actualCode >= 550 && actualCode <= 559) {
    exists = 'undeliverable';
  } else {
    // 421 (service unavailable), 0 (timeout/connection refused), etc.
    exists = 'unknown';
  }

  return { exists, catchAll };
}
