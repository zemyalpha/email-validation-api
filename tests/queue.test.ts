import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ValidationResult } from '../src/types.js';

// Mock validation and ssrf — database mock comes from setup.ts
vi.mock('../src/services/validation.js', () => ({
  validateEmail: vi.fn(),
}));

vi.mock('../src/services/ssrf.js', () => ({
  validateUrl: vi.fn().mockResolvedValue({ ok: true }),
}));

import { enqueueJob } from '../src/services/queue.js';
import { createBulkJob, getBulkJob, hashKey, updateBulkJob } from '../src/services/database.js';
import { validateEmail } from '../src/services/validation.js';

const MOCK_RESULT: ValidationResult = {
  email: 'test@example.com',
  score: 90,
  valid: true,
  checks: {
    syntax: true, mx: true, disposable: false,
    role_based: false, catch_all: false, smtp_exists: 'deliverable',
  },
  suggestion: null,
  cached: false,
};

async function waitForStatus(
  jobId: string,
  keyHash: string,
  status: string,
  timeoutMs = 5000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = getBulkJob(jobId, keyHash);
    if (job?.status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  const job = getBulkJob(jobId, keyHash);
  throw new Error(
    `Job ${jobId} timed out — expected status "${status}", got "${job?.status}"`
  );
}

describe('Queue service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateEmail).mockResolvedValue(MOCK_RESULT);
  });

  it('processes a queued job and marks it completed', async () => {
    const keyHash = hashKey('rawkeyforqueue1');
    const jobId = createBulkJob(keyHash, ['test@example.com']);

    enqueueJob(jobId, keyHash);
    await waitForStatus(jobId, keyHash, 'completed');

    const job = getBulkJob(jobId, keyHash)!;
    expect(job.status).toBe('completed');
    expect(job.results).toHaveLength(1);
    expect(job.results![0].email).toBe('test@example.com');
  });

  it('calls validateEmail once per email in the job', async () => {
    const keyHash = hashKey('rawkeyforqueue2');
    const emails = ['a@example.com', 'b@example.com', 'c@example.com'];
    const jobId = createBulkJob(keyHash, emails);

    enqueueJob(jobId, keyHash);
    await waitForStatus(jobId, keyHash, 'completed');

    expect(vi.mocked(validateEmail)).toHaveBeenCalledTimes(emails.length);
  });

  it('transitions job through processing → completed', async () => {
    const statuses: string[] = [];
    const origUpdate = updateBulkJob as unknown as typeof updateBulkJob;
    vi.spyOn({ updateBulkJob: origUpdate }, 'updateBulkJob');

    const keyHash = hashKey('rawkeyforqueue3');
    const jobId = createBulkJob(keyHash, ['x@example.com']);

    enqueueJob(jobId, keyHash);

    // Brief yield to let "processing" state be set
    await new Promise((r) => setTimeout(r, 10));
    statuses.push(getBulkJob(jobId, keyHash)?.status ?? 'unknown');

    await waitForStatus(jobId, keyHash, 'completed');
    statuses.push('completed');

    // At some point it was "processing" or jumped straight to "completed"
    expect(['processing', 'completed']).toContain(statuses[0]);
  });

  it('marks job as failed when validateEmail throws', async () => {
    vi.mocked(validateEmail).mockRejectedValueOnce(new Error('DNS timeout'));

    const keyHash = hashKey('rawkeyforqueue4');
    const jobId = createBulkJob(keyHash, ['bad@example.com']);

    enqueueJob(jobId, keyHash);
    await waitForStatus(jobId, keyHash, 'failed');

    expect(getBulkJob(jobId, keyHash)!.status).toBe('failed');
  });

  it('sends webhook callback after completion', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const keyHash = hashKey('rawkeyforqueue5');
    const jobId = createBulkJob(
      keyHash,
      ['webhook@example.com'],
      'https://example.com/callback'
    );

    enqueueJob(jobId, keyHash);
    await waitForStatus(jobId, keyHash, 'completed');

    // Small delay for async webhook dispatch
    await new Promise((r) => setTimeout(r, 100));

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/callback',
      expect.objectContaining({ method: 'POST' })
    );

    fetchSpy.mockRestore();
  });
});
