import { SmtpCheckResult, ValidationResult } from '../types.js';
import { getCachedResult, setCachedResult } from './cache.js';
import { hasMxRecords } from './dns.js';
import { isDisposable, isRoleBased } from './disposable.js';
import { appMetrics } from './metrics.js';
import { smtpVerify } from './smtp.js';
import { suggestCorrection } from './typo.js';

/* eslint-disable no-control-regex */
// RFC 5322 compliant email regex (covers 99.9% of real addresses)
const EMAIL_REGEX =
  /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
/* eslint-enable no-control-regex */

export function checkSyntax(email: string): boolean {
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function parseEmail(email: string): { local: string; domain: string } | null {
  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return null;
  return {
    local: email.slice(0, atIdx),
    domain: email.slice(atIdx + 1).toLowerCase(),
  };
}

function computeScore(checks: ValidationResult['checks']): number {
  let score = 100;
  if (!checks.syntax) score -= 50;           // fatal — cannot route without valid syntax
  if (!checks.mx) score -= 30;              // major — domain has no mail exchanger
  if (checks.disposable) score -= 25;       // strong negative — throwaway address
  if (checks.role_based) score -= 10;       // moderate — functional account, not personal
  if (checks.catch_all) score -= 5;         // minor — existence check is unreliable
  if (checks.smtp_exists === 'undeliverable') score -= 30; // SMTP 550 confirms rejection
  return Math.max(0, Math.min(100, score));
}

export async function validateEmail(rawEmail: string): Promise<ValidationResult> {
  const email = rawEmail.trim().toLowerCase();

  const cached = await getCachedResult(email);
  if (cached) {
    appMetrics.incCacheHit();
    return cached;
  }
  appMetrics.incCacheMiss();

  const syntaxOk = checkSyntax(email);
  const parsed = parseEmail(email);

  let mx = false;
  let disposable = false;
  let roleBased = false;
  let catchAll = false;
  let smtpExists: SmtpCheckResult = 'unknown';
  let suggestion: string | null = null;

  if (syntaxOk && parsed) {
    // MX lookup and SMTP verification run concurrently to minimise latency
    const [mxResult, smtpResult] = await Promise.all([
      hasMxRecords(parsed.domain),
      smtpVerify(email, parsed.domain),
    ]);
    mx = mxResult;
    catchAll = smtpResult.catchAll;
    smtpExists = smtpResult.exists;
    disposable = isDisposable(parsed.domain);
    roleBased = isRoleBased(parsed.local);
    suggestion = suggestCorrection(email);
    appMetrics.incSmtpCheck();
  } else {
    suggestion = suggestCorrection(email);
  }

  const checks: ValidationResult['checks'] = {
    syntax: syntaxOk,
    mx,
    disposable,
    role_based: roleBased,
    catch_all: catchAll,
    smtp_exists: smtpExists,
  };

  const score = computeScore(checks);
  const result: ValidationResult = {
    email,
    score,
    // An SMTP 550 (undeliverable) voids the valid flag even if syntax + MX pass
    valid: score >= 50 && syntaxOk && mx && smtpExists !== 'undeliverable',
    checks,
    suggestion,
    cached: false,
  };

  appMetrics.incValidation();
  if (result.valid) {
    appMetrics.incValid();
  } else {
    appMetrics.incInvalid();
  }

  await setCachedResult(result);
  return result;
}
