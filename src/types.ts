export type SmtpCheckResult = 'deliverable' | 'undeliverable' | 'unknown';

export interface ValidationResult {
  email: string;
  score: number;
  valid: boolean;
  checks: {
    syntax: boolean;
    mx: boolean;
    disposable: boolean;
    role_based: boolean;
    catch_all: boolean;
    smtp_exists: SmtpCheckResult;
  };
  suggestion: string | null;
  cached: boolean;
}

export interface BulkJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  emails: string[];
  webhook_url?: string;
  results?: ValidationResult[];
  created_at: string;
  completed_at?: string;
}

export interface ApiKey {
  key: string;
  user_id: string;
  plan: 'free' | 'basic' | 'pro';
  requests_today: number;
  daily_limit: number;
}

export interface UsageStats {
  plan: 'free' | 'basic' | 'pro';
  requests_today: number;
  daily_limit: number;
  resets_at: string;
}

// PRICING: free=$0/mo (50 req/day), basic=$14.99/mo (1,000 req/day, $0.01/overage), pro=$79/mo (10,000 req/day, $0.01/overage)
export const PLAN_LIMITS: Record<ApiKey['plan'], number> = {
  free: 50,
  basic: 1000,
  pro: 10000,
};
