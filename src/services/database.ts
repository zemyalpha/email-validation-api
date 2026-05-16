import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from '../config.js';
import { ApiKey, BulkJob, PLAN_LIMITS, ValidationResult } from '../types.js';

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    if (config.db.path !== ':memory:') {
      const dbDir = path.dirname(config.db.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }
    db = new DatabaseSync(config.db.path);
    initSchema(db);
  }
  return db;
}

function initSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      daily_limit INTEGER NOT NULL DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS usage_counters (
      key_hash TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (key_hash, date)
    );

    CREATE TABLE IF NOT EXISTS bulk_jobs (
      job_id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      emails TEXT NOT NULL,
      webhook_url TEXT,
      results TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);
}

export function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function createApiKey(plan: ApiKey['plan'] = 'free'): { rawKey: string; userId: string } {
  const rawKey = `evapi_${randomBytes(24).toString('hex')}`;
  const userId = `user_${randomBytes(8).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const dailyLimit = PLAN_LIMITS[plan];

  const database = getDb();
  database.prepare(
    'INSERT INTO api_keys (key_hash, user_id, plan, daily_limit) VALUES (?, ?, ?, ?)'
  ).run(keyHash, userId, plan, dailyLimit);

  return { rawKey, userId };
}

export function lookupApiKey(rawKey: string): ApiKey | null {
  const keyHash = hashKey(rawKey);
  const database = getDb();
  const row = database
    .prepare('SELECT key_hash, user_id, plan, daily_limit FROM api_keys WHERE key_hash = ?')
    .get(keyHash) as { key_hash: string; user_id: string; plan: string; daily_limit: number } | undefined;

  if (!row) return null;

  const today = new Date().toISOString().slice(0, 10);
  const usageRow = database
    .prepare('SELECT count FROM usage_counters WHERE key_hash = ? AND date = ?')
    .get(keyHash, today) as { count: number } | undefined;

  return {
    key: keyHash,
    user_id: row.user_id,
    plan: row.plan as ApiKey['plan'],
    requests_today: Number(usageRow?.count ?? 0),
    daily_limit: Number(row.daily_limit),
  };
}

export function incrementUsage(keyHash: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const database = getDb();
  database.prepare(`
    INSERT INTO usage_counters (key_hash, date, count) VALUES (?, ?, 1)
    ON CONFLICT (key_hash, date) DO UPDATE SET count = count + 1
  `).run(keyHash, today);
}

export function createBulkJob(
  keyHash: string,
  emails: string[],
  webhookUrl?: string
): string {
  const jobId = `job_${randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const database = getDb();
  database.prepare(
    'INSERT INTO bulk_jobs (job_id, key_hash, status, emails, webhook_url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(jobId, keyHash, 'queued', JSON.stringify(emails), webhookUrl ?? null, now);
  return jobId;
}

export function getBulkJob(jobId: string, keyHash: string): BulkJob | null {
  const database = getDb();
  const row = database
    .prepare('SELECT * FROM bulk_jobs WHERE job_id = ? AND key_hash = ?')
    .get(jobId, keyHash) as {
      job_id: string;
      status: string;
      emails: string;
      webhook_url: string | null;
      results: string | null;
      created_at: string;
      completed_at: string | null;
    } | undefined;

  if (!row) return null;

  return {
    job_id: row.job_id,
    status: row.status as BulkJob['status'],
    emails: JSON.parse(row.emails) as string[],
    webhook_url: row.webhook_url ?? undefined,
    results: row.results ? (JSON.parse(row.results) as ValidationResult[]) : undefined,
    created_at: row.created_at,
    completed_at: row.completed_at ?? undefined,
  };
}

export function updateBulkJob(
  jobId: string,
  status: BulkJob['status'],
  results?: ValidationResult[]
): void {
  const database = getDb();
  const completedAt = (status === 'completed' || status === 'failed') ? new Date().toISOString() : null;
  database.prepare(
    'UPDATE bulk_jobs SET status = ?, results = ?, completed_at = ? WHERE job_id = ?'
  ).run(status, results ? JSON.stringify(results) : null, completedAt, jobId);
}

export function upgradeApiKeyPlanByUserId(userId: string, plan: ApiKey['plan']): void {
  const dailyLimit = PLAN_LIMITS[plan];
  const database = getDb();
  database.prepare(
    'UPDATE api_keys SET plan = ?, daily_limit = ? WHERE user_id = ?'
  ).run(plan, dailyLimit, userId);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
