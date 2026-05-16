import { promises as dnsPromises } from 'dns';
import { isIP } from 'net';

/**
 * SSRF protection: blocks webhook URLs that point to private networks,
 * cloud metadata endpoints, or otherwise resolve to non-public IPs.
 *
 * All webhook URL processing MUST go through this function. There is no
 * bypass path.
 */
export interface ValidateUrlResult {
  ok: boolean;
  reason?: string;
}

const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number }> = [
  // 10.0.0.0/8
  { start: ipToInt('10.0.0.0'), end: ipToInt('10.255.255.255') },
  // 172.16.0.0/12
  { start: ipToInt('172.16.0.0'), end: ipToInt('172.31.255.255') },
  // 192.168.0.0/16
  { start: ipToInt('192.168.0.0'), end: ipToInt('192.168.255.255') },
  // 127.0.0.0/8 — loopback
  { start: ipToInt('127.0.0.0'), end: ipToInt('127.255.255.255') },
  // 169.254.0.0/16 — link-local (incl. cloud metadata 169.254.169.254)
  { start: ipToInt('169.254.0.0'), end: ipToInt('169.254.255.255') },
  // 0.0.0.0/8 — "this network"
  { start: ipToInt('0.0.0.0'), end: ipToInt('0.255.255.255') },
  // 100.64.0.0/10 — CGNAT
  { start: ipToInt('100.64.0.0'), end: ipToInt('100.127.255.255') },
  // 192.0.0.0/24 — IETF protocol assignments
  { start: ipToInt('192.0.0.0'), end: ipToInt('192.0.0.255') },
  // 198.18.0.0/15 — benchmarking
  { start: ipToInt('198.18.0.0'), end: ipToInt('198.19.255.255') },
];

function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function isPrivateIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  const numeric = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some((r) => numeric >= r.start && numeric <= r.end);
}

export function isPrivateIPv6(ip: string): boolean {
  if (isIP(ip) !== 6) return false;
  const normalized = ip.toLowerCase();
  // ::1 loopback
  if (normalized === '::1') return true;
  // ::ffff:0:0/96 — IPv4-mapped (let the IPv4 check handle the mapped value)
  if (normalized.startsWith('::ffff:')) {
    const v4 = normalized.split(':').pop();
    if (v4 && isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  // fc00::/7 — unique local
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  // fe80::/10 — link-local
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true;
  // ::/128 — unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  return false;
}

/**
 * Validate a webhook URL.
 *
 * - Must be http(s)
 * - Hostname must not be a private/loopback/link-local IP
 * - Resolved A/AAAA records must not point to private IPs (anti-rebinding)
 */
export async function validateUrl(rawUrl: string): Promise<ValidateUrlResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'URL is required' };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'URL must use http or https' };
  }

  const hostname = url.hostname;
  if (!hostname) {
    return { ok: false, reason: 'URL must have a hostname' };
  }

  // Explicit metadata-endpoint blocklist (catches names too, not just IPs)
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === 'metadata.google.internal' ||
    lowerHost === 'metadata' ||
    lowerHost === 'localhost' ||
    lowerHost.endsWith('.localhost')
  ) {
    return { ok: false, reason: 'URL targets a metadata or loopback host' };
  }

  // If hostname is a literal IP, check directly
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    if (isPrivateIPv4(hostname)) {
      return { ok: false, reason: 'URL resolves to a private IPv4 address' };
    }
    return { ok: true };
  }
  if (ipVersion === 6) {
    if (isPrivateIPv6(hostname)) {
      return { ok: false, reason: 'URL resolves to a private IPv6 address' };
    }
    return { ok: true };
  }

  // Resolve DNS to detect rebinding / hidden private targets.
  try {
    const addresses = await dnsPromises.lookup(hostname, { all: true });
    if (!addresses.length) {
      return { ok: false, reason: 'URL hostname does not resolve' };
    }
    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        return { ok: false, reason: 'URL resolves to a private IPv4 address' };
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        return { ok: false, reason: 'URL resolves to a private IPv6 address' };
      }
    }
  } catch {
    return { ok: false, reason: 'URL hostname could not be resolved' };
  }

  return { ok: true };
}
