import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { createApiKey } from '../src/services/database.js';

vi.mock('../src/services/dns.js', () => ({
  hasMxRecords: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/services/queue.js', () => ({
  enqueueJob: vi.fn(),
}));

describe('Bulk validation routes', () => {
  let app: FastifyInstance;
  let freeKey: string;
  let basicKey: string;

  beforeAll(async () => {
    app = await buildApp();
    freeKey = createApiKey('free').rawKey;
    basicKey = createApiKey('basic').rawKey;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/validate/bulk', () => {
    it('returns 403 for free plan users', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': freeKey },
        payload: { emails: ['a@example.com'] },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toMatch(/basic or pro/i);
    });

    it('returns 202 and queues a job for basic plan', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: { emails: ['a@example.com', 'b@test.com'] },
      });
      expect(res.statusCode).toBe(202);
      const body = res.json();
      expect(body.job_id).toMatch(/^job_/);
      expect(body.status).toBe('queued');
      expect(body.count).toBe(2);
    });

    it('accepts optional webhook_url', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: {
          emails: ['a@example.com'],
          webhook_url: 'https://example.com/hooks',
        },
      });
      expect(res.statusCode).toBe(202);
    });

    it('rejects webhook_url pointing to a private IP (SSRF)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: {
          emails: ['a@example.com'],
          webhook_url: 'http://127.0.0.1/hook',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/webhook/i);
    });

    it('rejects webhook_url targeting cloud metadata endpoint (SSRF)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: {
          emails: ['a@example.com'],
          webhook_url: 'http://169.254.169.254/latest/meta-data',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when emails array is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: { emails: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when more than 100 emails are submitted', async () => {
      const emails = Array.from({ length: 101 }, (_, i) => `user${i}@example.com`);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: { emails },
      });
      expect(res.statusCode).toBe(400);
    });

    it('calls enqueueJob after creating the job', async () => {
      const { enqueueJob } = await import('../src/services/queue.js');
      vi.mocked(enqueueJob).mockClear();

      await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: { emails: ['test@example.com'] },
      });
      expect(vi.mocked(enqueueJob)).toHaveBeenCalledOnce();
    });
  });

  describe('GET /v1/jobs/:job_id', () => {
    it('returns 404 for unknown job_id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/jobs/job_doesnotexist',
        headers: { 'x-api-key': basicKey },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns job status for a real job', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/validate/bulk',
        headers: { 'x-api-key': basicKey },
        payload: { emails: ['test@example.com'] },
      });
      const { job_id } = createRes.json() as { job_id: string };

      const res = await app.inject({
        method: 'GET',
        url: `/v1/jobs/${job_id}`,
        headers: { 'x-api-key': basicKey },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.job_id).toBe(job_id);
      expect(['queued', 'processing', 'completed']).toContain(body.status);
    });

    it('returns 401 without an API key', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/jobs/job_abc' });
      expect(res.statusCode).toBe(401);
    });
  });
});
