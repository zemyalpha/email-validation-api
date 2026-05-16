import { createHash, randomBytes } from 'node:crypto';
import { vi } from 'vitest';

process.env['DB_PATH'] = ':memory:';
process.env['NODE_ENV'] = 'test';

// In-memory database — avoids node:sqlite which Vite can't resolve at transform time.
const _keys = new Map<string, { userId: string; plan: string; dailyLimit: number }>();
const _counters = new Map<string, number>();
const _jobs = new Map<string, {
  job_id: string; key_hash: string; status: string;
  emails: string; webhook_url?: string; results?: string;
  created_at: string; completed_at?: string;
}>();
const LIMITS: Record<string, number> = { free: 50, basic: 1000, pro: 10000 };

function _hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

// Mock SQLite prepare for health check probe
const _mockStmt = {
  get: vi.fn().mockReturnValue({ val: 1 }),
  run: vi.fn(),
  all: vi.fn().mockReturnValue([]),
};

vi.mock('../src/services/database.js', () => ({
  hashKey: _hashKey,
  getDb: () => ({
    prepare: vi.fn().mockReturnValue(_mockStmt),
    exec: vi.fn(),
    close: vi.fn(),
  }),
  createApiKey: (plan = 'free') => {
    const rawKey = `evapi_${randomBytes(24).toString('hex')}`;
    const userId = `user_${randomBytes(8).toString('hex')}`;
    const keyHash = _hashKey(rawKey);
    _keys.set(keyHash, { userId, plan, dailyLimit: LIMITS[plan] ?? 50 });
    return { rawKey, userId };
  },
  lookupApiKey: (rawKey: string) => {
    const keyHash = _hashKey(rawKey);
    const key = _keys.get(keyHash);
    if (!key) return null;
    const today = new Date().toISOString().slice(0, 10);
    const count = _counters.get(`${keyHash}:${today}`) ?? 0;
    return { key: keyHash, user_id: key.userId, plan: key.plan, requests_today: count, daily_limit: key.dailyLimit };
  },
  incrementUsage: (keyHash: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const k = `${keyHash}:${today}`;
    _counters.set(k, (_counters.get(k) ?? 0) + 1);
  },
  upgradeApiKeyPlanByUserId: (userId: string, plan: string) => {
    for (const [, key] of _keys.entries()) {
      if (key.userId === userId) {
        key.plan = plan;
        key.dailyLimit = LIMITS[plan] ?? 50;
      }
    }
  },
  createBulkJob: (keyHash: string, emails: string[], webhookUrl?: string) => {
    const jobId = `job_${randomBytes(8).toString('hex')}`;
    _jobs.set(jobId, {
      job_id: jobId, key_hash: keyHash, status: 'queued',
      emails: JSON.stringify(emails), webhook_url: webhookUrl,
      created_at: new Date().toISOString(),
    });
    return jobId;
  },
  getBulkJob: (jobId: string, keyHash: string) => {
    const job = _jobs.get(jobId);
    if (!job || job.key_hash !== keyHash) return null;
    return {
      job_id: job.job_id, status: job.status,
      emails: JSON.parse(job.emails) as string[],
      webhook_url: job.webhook_url,
      results: job.results ? JSON.parse(job.results) : undefined,
      created_at: job.created_at,
      completed_at: job.completed_at,
    };
  },
  updateBulkJob: (jobId: string, status: string, results?: unknown[]) => {
    const job = _jobs.get(jobId);
    if (!job) return;
    job.status = status;
    if (results) job.results = JSON.stringify(results);
    if (status === 'completed' || status === 'failed') job.completed_at = new Date().toISOString();
  },
  closeDb: () => {},
}));

// Mock Redis client with ping support (needed for the deep health check)
const _redisMock = {
  ping: vi.fn().mockResolvedValue('PONG'),
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
  pipeline: vi.fn().mockReturnValue({
    incr: vi.fn().mockReturnThis(),
    expireat: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
};

vi.mock('../src/services/cache.js', () => ({
  getCachedResult: vi.fn().mockResolvedValue(null),
  setCachedResult: vi.fn().mockResolvedValue(undefined),
  getRedis: vi.fn().mockReturnValue(_redisMock),
  closeRedis: vi.fn().mockResolvedValue(undefined),
  getDailyCount: vi.fn().mockResolvedValue(0),
  incrementDailyCount: vi.fn().mockResolvedValue(undefined),
}));

// Mock SMTP so tests don't open real TCP connections
vi.mock('../src/services/smtp.js', () => ({
  smtpVerify: vi.fn().mockResolvedValue({ exists: 'deliverable', catchAll: false }),
}));
