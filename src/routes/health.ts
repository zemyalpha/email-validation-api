import { FastifyPluginAsync } from 'fastify';
import { getRedis } from '../services/cache.js';
import { getDb } from '../services/database.js';

interface ComponentStatus {
  status: 'ok' | 'error';
  latency_ms?: number;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  components: {
    redis: ComponentStatus;
    database: ComponentStatus;
  };
  timestamp: string;
}

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: HealthResponse }>(
    '/v1/health',
    {
      config: { skipAuth: true },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              components: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    latency_ms: { type: 'number' },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              components: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const components: HealthResponse['components'] = {
        redis: { status: 'error' },
        database: { status: 'error' },
      };

      // Redis liveness — ping and measure round-trip
      const redisStart = Date.now();
      try {
        await getRedis().ping();
        components.redis = { status: 'ok', latency_ms: Date.now() - redisStart };
      } catch {
        components.redis = { status: 'error' };
      }

      // SQLite liveness — a trivial query is sufficient
      const dbStart = Date.now();
      try {
        getDb().prepare('SELECT 1 AS val').get();
        components.database = { status: 'ok', latency_ms: Date.now() - dbStart };
      } catch {
        components.database = { status: 'error' };
      }

      const allOk = Object.values(components).every((c) => c.status === 'ok');
      const httpStatus = allOk ? 200 : 503;

      return reply.status(httpStatus).send({
        status: allOk ? 'ok' : 'degraded',
        components,
        timestamp: new Date().toISOString(),
      });
    }
  );
};

export default healthRoute;
