import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createApiKey } from '../src/services/database.js';

describe('GET /v1/usage', () => {
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

  it('returns usage stats for free plan', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': freeKey },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe('free');
    expect(body.daily_limit).toBe(50);
    expect(typeof body.requests_today).toBe('number');
    expect(body.resets_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns correct daily_limit for basic plan', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': basicKey },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().daily_limit).toBe(1000);
  });

  it('returns 401 without API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/usage' });
    expect(res.statusCode).toBe(401);
  });

  it('resets_at is always the next UTC midnight', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: { 'x-api-key': freeKey },
    });
    const { resets_at } = res.json() as { resets_at: string };
    const resetsDate = new Date(resets_at);
    expect(resetsDate.getUTCHours()).toBe(0);
    expect(resetsDate.getUTCMinutes()).toBe(0);
    expect(resetsDate > new Date()).toBe(true);
  });
});
