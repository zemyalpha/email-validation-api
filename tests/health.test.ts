import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('GET /v1/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with status ok when all deps healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
  });

  it('returns component-level health for redis and database', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    const body = res.json();
    expect(body.components).toBeDefined();
    expect(body.components.redis).toBeDefined();
    expect(body.components.database).toBeDefined();
    expect(['ok', 'error']).toContain(body.components.redis.status);
    expect(['ok', 'error']).toContain(body.components.database.status);
  });

  it('includes a timestamp in ISO 8601 format', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    const { timestamp } = res.json() as { timestamp: string };
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  });

  it('includes latency_ms for healthy components', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    const body = res.json();
    if (body.components.redis.status === 'ok') {
      expect(typeof body.components.redis.latency_ms).toBe('number');
    }
    if (body.components.database.status === 'ok') {
      expect(typeof body.components.database.latency_ms).toBe('number');
    }
  });

  it('does not require an API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).not.toBe(401);
  });

  it('returns JSON content-type', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.headers['content-type']).toContain('application/json');
  });
});
