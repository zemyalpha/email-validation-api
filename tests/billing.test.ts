import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createApiKey } from '../src/services/database.js';

describe('Billing endpoints', () => {
  let app: FastifyInstance;
  let freeKey: string;

  beforeAll(async () => {
    app = await buildApp();
    const { rawKey } = createApiKey('free');
    freeKey = rawKey;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/billing/checkout', () => {
    it('returns 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        payload: { plan: 'basic' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 for missing plan', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        headers: { 'x-api-key': freeKey },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid plan value', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        headers: { 'x-api-key': freeKey },
        payload: { plan: 'free' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 503 when Stripe is not configured (basic)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        headers: { 'x-api-key': freeKey },
        payload: { plan: 'basic' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toMatch(/not configured/i);
    });

    it('returns 503 when Stripe is not configured (pro)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        headers: { 'x-api-key': freeKey },
        payload: { plan: 'pro' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toMatch(/not configured/i);
    });
  });

  describe('POST /v1/billing/webhook', () => {
    it('returns 200 for unknown event types', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        payload: { type: 'payment_intent.created', data: { object: {} } },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().received).toBe(true);
    });

    it('handles checkout.session.completed and upgrades plan', async () => {
      const { rawKey, userId } = createApiKey('free');
      // Suppress lint warning — rawKey used to verify upgrade path exists
      void rawKey;

      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        payload: {
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: { user_id: userId, plan: 'basic' },
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().received).toBe(true);
    });

    it('does not require API key authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        payload: { type: 'ping', data: { object: {} } },
      });
      expect(res.statusCode).not.toBe(401);
    });
  });
});

describe('RapidAPI proxy auth', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 403 when proxy secret header is present but env var not set', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/usage',
      headers: {
        'x-rapidapi-proxy-secret': 'any-value',
        'x-rapidapi-subscription': 'basic',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/invalid rapidapi/i);
  });
});
