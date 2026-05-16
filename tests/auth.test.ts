import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createApiKey, hashKey, incrementUsage } from '../src/services/database.js';

describe('Auth middleware', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/usage' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/missing/i);
  });

  it('returns 401 for an invalid API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': 'evapi_invalid_key_that_does_not_exist' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/invalid/i);
  });

  it('passes through with a valid API key', async () => {
    const { rawKey } = createApiKey('free');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': rawKey },
    });
    expect(res.statusCode).toBe(200);
  });

  it('skips auth for /v1/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
  });

  it('skips auth for GET /v1/metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/metrics' });
    expect(res.statusCode).toBe(200);
  });

  it('skips auth for POST /v1/keys', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: {},
    });
    expect(res.statusCode).toBe(201);
  });

  it('returns 429 with retry_after when daily quota is exhausted', async () => {
    const { rawKey } = createApiKey('free'); // daily_limit = 50
    const kHash = hashKey(rawKey);

    // Exhaust the quota by directly incrementing the mock counter
    for (let i = 0; i < 50; i++) {
      incrementUsage(kHash);
    }

    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': rawKey },
    });
    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.error).toMatch(/quota/i);
    expect(body.retry_after).toBeDefined();
    expect(new Date(body.retry_after as string).getTime()).toBeGreaterThan(Date.now());
  });
});
