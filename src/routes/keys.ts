import { FastifyPluginAsync, RouteShorthandOptions } from 'fastify';
import { createApiKey } from '../services/database.js';
import { ApiKey, PLAN_LIMITS } from '../types.js';

interface RegisterBody {
  plan?: 'free' | 'basic' | 'pro';
}

// Skip rate-limiting in tests so the suite can register many keys quickly.
const RATE_LIMIT_DISABLED = process.env['NODE_ENV'] === 'test';

const keysRoute: FastifyPluginAsync = async (fastify) => {
  const routeConfig: Record<string, unknown> = { skipAuth: true };
  if (!RATE_LIMIT_DISABLED) {
    // 5 requests per IP per hour — anti-DoS for self-service registration.
    routeConfig['rateLimit'] = { max: 5, timeWindow: '1 hour' };
  }

  const opts: RouteShorthandOptions = {
    config: routeConfig,
    schema: {
      body: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['free', 'basic', 'pro'] },
        },
        additionalProperties: false,
      },
      response: {
        201: {
          type: 'object',
          properties: {
            api_key: { type: 'string' },
            user_id: { type: 'string' },
            plan: { type: 'string' },
            daily_limit: { type: 'number' },
            message: { type: 'string' },
          },
        },
      },
    },
  };

  fastify.post<{ Body: RegisterBody }>('/v1/keys', opts, async (request, reply) => {
    const plan: ApiKey['plan'] = request.body?.plan ?? 'free';

    if (plan === 'basic' || plan === 'pro') {
      return reply.status(402).send({
        error: 'Payment required',
        message: `The ${plan} plan requires a paid subscription. Start checkout at POST /v1/billing/checkout`,
        checkout_url: '/v1/billing/checkout',
      });
    }

    const { rawKey, userId } = createApiKey(plan);

    return reply.status(201).send({
      api_key: rawKey,
      user_id: userId,
      plan,
      daily_limit: PLAN_LIMITS[plan],
      message: 'Store your API key securely — it will not be shown again.',
    });
  });
};

export default keysRoute;
