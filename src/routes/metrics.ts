import { FastifyPluginAsync } from 'fastify';
import { appMetrics, MetricsSnapshot } from '../services/metrics.js';

const metricsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: MetricsSnapshot }>(
    '/v1/metrics',
    {
      config: { skipAuth: true },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              total_validations: { type: 'number' },
              cache_hits: { type: 'number' },
              cache_misses: { type: 'number' },
              cache_hit_rate: { type: 'number' },
              valid_emails: { type: 'number' },
              invalid_emails: { type: 'number' },
              smtp_checks: { type: 'number' },
              uptime_seconds: { type: 'number' },
            },
          },
        },
      },
    },
    async () => {
      return appMetrics.snapshot();
    }
  );
};

export default metricsRoute;
