export interface MetricsSnapshot {
  total_validations: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  valid_emails: number;
  invalid_emails: number;
  smtp_checks: number;
  uptime_seconds: number;
}

let totalValidations = 0;
let cacheHits = 0;
let cacheMisses = 0;
let validEmails = 0;
let invalidEmails = 0;
let smtpChecks = 0;

export const appMetrics = {
  incValidation(): void {
    totalValidations++;
  },
  incCacheHit(): void {
    cacheHits++;
  },
  incCacheMiss(): void {
    cacheMisses++;
  },
  incValid(): void {
    validEmails++;
  },
  incInvalid(): void {
    invalidEmails++;
  },
  incSmtpCheck(): void {
    smtpChecks++;
  },
  snapshot(): MetricsSnapshot {
    const cacheLookups = cacheHits + cacheMisses;
    return {
      total_validations: totalValidations,
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      cache_hit_rate:
        cacheLookups > 0
          ? Math.round((cacheHits / cacheLookups) * 10000) / 10000
          : 0,
      valid_emails: validEmails,
      invalid_emails: invalidEmails,
      smtp_checks: smtpChecks,
      uptime_seconds: Math.floor(process.uptime()),
    };
  },
};
