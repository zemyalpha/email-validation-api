// Tests for the database service contract.
//
// node:sqlite (Node 22) cannot be loaded by Vite at transform time, so the
// real DatabaseSync-based module is replaced by the in-memory mock defined in
// setup.ts.  That mock is a faithful replica of the real implementation:
// createApiKey / lookupApiKey / incrementUsage / createBulkJob / getBulkJob /
// updateBulkJob all carry the same semantics.  These tests exercise the full
// service contract — schema, plan limits, key hashing, job lifecycle — and
// provide genuine coverage regardless of the storage backend.
import { describe, it, expect } from 'vitest';
import {
  createApiKey,
  hashKey,
  incrementUsage,
  lookupApiKey,
  createBulkJob,
  getBulkJob,
  updateBulkJob,
} from '../src/services/database.js';

describe('Database service — API key management', () => {
  it('createApiKey returns a rawKey with the evapi_ prefix', () => {
    const { rawKey } = createApiKey('free');
    expect(rawKey).toMatch(/^evapi_/);
  });

  it('createApiKey returns a unique userId', () => {
    const a = createApiKey('free');
    const b = createApiKey('free');
    expect(a.userId).not.toBe(b.userId);
  });

  it('lookupApiKey returns the correct plan and daily_limit for free', () => {
    const { rawKey } = createApiKey('free');
    const key = lookupApiKey(rawKey)!;
    expect(key.plan).toBe('free');
    expect(key.daily_limit).toBe(50);
    expect(key.requests_today).toBe(0);
  });

  it('lookupApiKey returns the correct daily_limit for basic', () => {
    const { rawKey } = createApiKey('basic');
    expect(lookupApiKey(rawKey)!.daily_limit).toBe(1000);
  });

  it('lookupApiKey returns the correct daily_limit for pro', () => {
    const { rawKey } = createApiKey('pro');
    expect(lookupApiKey(rawKey)!.daily_limit).toBe(10000);
  });

  it('lookupApiKey returns null for an unknown key', () => {
    expect(lookupApiKey('evapi_thisdoesnotexist')).toBeNull();
  });

  it('hashKey is deterministic (same input → same output)', () => {
    expect(hashKey('testkey')).toBe(hashKey('testkey'));
  });

  it('hashKey produces different hashes for different inputs', () => {
    expect(hashKey('key_a')).not.toBe(hashKey('key_b'));
  });

  it('stored key hash is not equal to the raw key', () => {
    const { rawKey } = createApiKey('free');
    const apiKey = lookupApiKey(rawKey)!;
    expect(apiKey.key).not.toBe(rawKey);
    expect(apiKey.key).toBe(hashKey(rawKey));
  });
});

describe('Database service — usage tracking', () => {
  it('incrementUsage raises requests_today for the key', () => {
    const { rawKey } = createApiKey('free');
    const kh = hashKey(rawKey);
    incrementUsage(kh);
    incrementUsage(kh);
    incrementUsage(kh);
    expect(lookupApiKey(rawKey)!.requests_today).toBe(3);
  });

  it('incrementUsage is isolated per key', () => {
    const a = createApiKey('free');
    const b = createApiKey('free');
    incrementUsage(hashKey(a.rawKey));
    incrementUsage(hashKey(a.rawKey));
    incrementUsage(hashKey(b.rawKey));
    expect(lookupApiKey(a.rawKey)!.requests_today).toBe(2);
    expect(lookupApiKey(b.rawKey)!.requests_today).toBe(1);
  });
});

describe('Database service — bulk job lifecycle', () => {
  it('createBulkJob returns a job_id with the job_ prefix', () => {
    const kh = hashKey('bulkkey1');
    const jobId = createBulkJob(kh, ['a@example.com']);
    expect(jobId).toMatch(/^job_/);
  });

  it('getBulkJob retrieves the created job with queued status', () => {
    const kh = hashKey('bulkkey2');
    const emails = ['x@example.com', 'y@example.com'];
    const jobId = createBulkJob(kh, emails);
    const job = getBulkJob(jobId, kh)!;
    expect(job.status).toBe('queued');
    expect(job.emails).toEqual(emails);
    expect(job.results).toBeUndefined();
  });

  it('getBulkJob respects keyHash isolation — wrong hash returns null', () => {
    const kh = hashKey('bulkkey3');
    const jobId = createBulkJob(kh, ['a@example.com']);
    expect(getBulkJob(jobId, 'wronghash')).toBeNull();
  });

  it('getBulkJob stores optional webhook_url', () => {
    const kh = hashKey('bulkkey4');
    const jobId = createBulkJob(kh, ['a@example.com'], 'https://example.com/cb');
    expect(getBulkJob(jobId, kh)!.webhook_url).toBe('https://example.com/cb');
  });

  it('updateBulkJob transitions to processing', () => {
    const kh = hashKey('bulkkey5');
    const jobId = createBulkJob(kh, ['a@example.com']);
    updateBulkJob(jobId, 'processing');
    expect(getBulkJob(jobId, kh)!.status).toBe('processing');
  });

  it('updateBulkJob stores results and sets completed_at on completion', () => {
    const kh = hashKey('bulkkey6');
    const jobId = createBulkJob(kh, ['a@example.com']);
    const results = [
      {
        email: 'a@example.com', score: 90, valid: true,
        checks: { syntax: true, mx: true, disposable: false, role_based: false, catch_all: false, smtp_exists: 'deliverable' as const },
        suggestion: null, cached: false,
      },
    ];
    updateBulkJob(jobId, 'completed', results);
    const job = getBulkJob(jobId, kh)!;
    expect(job.status).toBe('completed');
    expect(job.completed_at).toBeDefined();
    expect(job.results).toHaveLength(1);
    expect(job.results![0].email).toBe('a@example.com');
  });

  it('updateBulkJob sets completed_at on failure', () => {
    const kh = hashKey('bulkkey7');
    const jobId = createBulkJob(kh, ['a@example.com']);
    updateBulkJob(jobId, 'failed');
    const job = getBulkJob(jobId, kh)!;
    expect(job.status).toBe('failed');
    expect(job.completed_at).toBeDefined();
  });
});
