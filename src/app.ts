import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import billingRoute from './routes/billing.js';
import bulkRoute from './routes/bulk.js';
import healthRoute from './routes/health.js';
import keysRoute from './routes/keys.js';
import metricsRoute from './routes/metrics.js';
import usageRoute from './routes/usage.js';
import validateRoute from './routes/validate.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      serializers: {
        req(request) {
          // Redact X-API-Key from all log lines to prevent key exposure
          const headers: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(request.headers ?? {})) {
            headers[k] = k.toLowerCase() === 'x-api-key' ? '[REDACTED]' : v;
          }
          return { method: request.method, url: request.url, headers };
        },
      },
    },
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  await fastify.register(helmet, { global: true });
  await fastify.register(cors, { origin: false });
  // Global rate limiter is opt-in per route via config.rateLimit.
  // Used to throttle /v1/keys registration (anti-abuse).
  await fastify.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(authPlugin);

  await fastify.register(healthRoute);
  await fastify.register(metricsRoute);
  await fastify.register(keysRoute);
  await fastify.register(billingRoute);
  await fastify.register(validateRoute);
  await fastify.register(bulkRoute);
  await fastify.register(usageRoute);

  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    fastify.log.error(error);
    return reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
    });
  });

  return fastify;
}
