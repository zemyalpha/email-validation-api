import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { createApiKey } from '../src/services/database.js';

vi.mock('../src/services/dns.js', () => ({
  hasMxRecords: vi.fn().mockResolvedValue(true),
}));

describe('POST /v1/validate', () => {
  let app: FastifyInstance;
  let apiKey: string;

  beforeAll(async () => {
    app = await buildApp();
    const { rawKey } = createApiKey('free');
    apiKey = rawKey;
  });

  afterAll(async () => {
    await app.close();
  });

  function post(body: unknown, key = apiKey) {
    return app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { 'x-api-key': key },
      payload: body,
    });
  }

  it('validates a good email and returns score + checks', async () => {
    const res = await post({ email: 'alice@example.com' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe('alice@example.com');
    expect(body.score).toBeGreaterThan(0);
    expect(body.checks.syntax).toBe(true);
    expect(body.checks.mx).toBe(true);
    expect(body.valid).toBe(true);
    expect(body.cached).toBe(false);
  });

  it('includes smtp_exists field in the response', async () => {
    const res = await post({ email: 'user@example.com' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(['deliverable', 'undeliverable', 'unknown']).toContain(body.checks.smtp_exists);
  });

  it('returns syntax: false for a malformed email', async () => {
    const res = await post({ email: 'not-an-email' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.checks.syntax).toBe(false);
    expect(body.valid).toBe(false);
    expect(body.score).toBeLessThan(50);
  });

  it('detects a disposable email domain', async () => {
    const res = await post({ email: 'user@mailinator.com' });
    expect(res.statusCode).toBe(200);
    expect(res.json().checks.disposable).toBe(true);
  });

  it('detects a role-based email', async () => {
    const res = await post({ email: 'admin@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.json().checks.role_based).toBe(true);
  });

  it('suggests a correction for a typo domain', async () => {
    const res = await post({ email: 'user@gmial.com' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.suggestion).toBe('user@gmail.com');
  });

  it('marks email invalid when smtp_exists is undeliverable', async () => {
    const { smtpVerify } = await import('../src/services/smtp.js');
    vi.mocked(smtpVerify).mockResolvedValueOnce({ exists: 'undeliverable', catchAll: false });

    const res = await post({ email: 'bounced@example.com' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.checks.smtp_exists).toBe('undeliverable');
    expect(body.valid).toBe(false);
  });

  it('returns 400 when email field is missing', async () => {
    const res = await post({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for email exceeding 254 chars', async () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    const res = await post({ email: longEmail });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without an API key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/validate',
      payload: { email: 'test@example.com' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('normalizes email to lowercase', async () => {
    const res = await post({ email: 'Alice@Example.COM' });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe('alice@example.com');
  });
});
