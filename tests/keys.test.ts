import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('POST /v1/keys', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a free API key with no body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.api_key).toMatch(/^evapi_/);
    expect(body.plan).toBe('free');
    expect(body.daily_limit).toBe(50);
    expect(body.user_id).toBeTruthy();
    expect(body.message).toBeTruthy();
  });

  it('returns 402 for basic plan (payment required)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: { plan: 'basic' },
    });
    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.error).toMatch(/payment required/i);
    expect(body.checkout_url).toBe('/v1/billing/checkout');
  });

  it('returns 402 for pro plan (payment required)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: { plan: 'pro' },
    });
    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.error).toMatch(/payment required/i);
    expect(body.checkout_url).toBe('/v1/billing/checkout');
  });

  it('rejects invalid plan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: { plan: 'enterprise' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('does not require authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/keys',
      payload: {},
    });
    expect(res.statusCode).not.toBe(401);
  });
});
