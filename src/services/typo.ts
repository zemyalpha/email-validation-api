// Well-known email domains for typo correction
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com',
  'proton.me', 'fastmail.com', 'zoho.com', 'yandex.com', 'yandex.ru',
  'mail.com', 'inbox.com', 'tutanota.com', 'gmx.com', 'gmx.net',
  'hotmail.co.uk', 'yahoo.co.uk', 'yahoo.co.jp', 'yahoo.fr',
  'msn.com', 'comcast.net', 'verizon.net', 'att.net', 'cox.net',
  'sbcglobal.net', 'bellsouth.net', 'charter.net',
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function suggestCorrection(email: string): string | null {
  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return null;

  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1).toLowerCase();

  let bestDomain: string | null = null;
  let bestDist = Infinity;

  for (const candidate of COMMON_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestDomain = candidate;
    }
  }

  // Only suggest if distance is small (1-2 chars) and not already correct
  if (bestDomain && bestDist > 0 && bestDist <= 2) {
    return `${local}@${bestDomain}`;
  }

  return null;
}
