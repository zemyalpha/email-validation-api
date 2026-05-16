import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config.js';
import { hashKey, incrementUsage, lookupApiKey } from '../services/database.js';
import { ApiKey, PLAN_LIMITS } from '../types.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey: ApiKey;
  }
  interface FastifyContextConfig {
    skipAuth?: boolean;
  }
}

function mapRapidApiPlan(subscription: string | undefined): ApiKey['plan'] {
  if (!subscription) return 'free';
  const s = subscription.toLowerCase();
  if (s.includes('pro')) return 'pro';
  if (s.includes('basic')) return 'basic';
  return 'free';
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('apiKey', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const routeConfig = (request.routeOptions as unknown as { config?: { skipAuth?: boolean } })?.config;
    if (routeConfig?.skipAuth) return;

    // RapidAPI marketplace proxy: validate proxy secret then trust subscription header
    const rapidApiSecret = request.headers['x-rapidapi-proxy-secret'];
    if (rapidApiSecret) {
      const expected = config.rapidApi.proxySecret;
      if (!expected || rapidApiSecret !== expected) {
        return reply.status(403).send({ error: 'Invalid RapidAPI proxy secret' });
      }
      const subscription = request.headers['x-rapidapi-subscription'] as string | undefined;
      const rapidUser = request.headers['x-rapidapi-user'] as string | undefined;
      const plan = mapRapidApiPlan(subscription);
      request.apiKey = {
        key: 'rapidapi-proxy',
        user_id: rapidUser ?? 'rapidapi-user',
        plan,
        requests_today: 0,
        daily_limit: PLAN_LIMITS[plan],
      };
      return;
    }

    const rawKey = request.headers['x-api-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return reply.status(401).send({ error: 'Missing X-API-Key header' });
    }

    const apiKey = lookupApiKey(rawKey);
    if (!apiKey) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    if (apiKey.requests_today >= apiKey.daily_limit) {
      const resets = new Date();
      resets.setUTCDate(resets.getUTCDate() + 1);
      resets.setUTCHours(0, 0, 0, 0);
      return reply.status(429).send({
        error: 'Daily quota exceeded',
        retry_after: resets.toISOString(),
      });
    }

    request.apiKey = apiKey;
    const keyHash = hashKey(rawKey);
    incrementUsage(keyHash);
  });
};

export default fp(authPlugin, { name: 'auth' });
