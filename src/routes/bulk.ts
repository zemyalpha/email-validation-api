import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { createBulkJob, getBulkJob } from '../services/database.js';
import { hashKey } from '../services/database.js';
import { enqueueJob } from '../services/queue.js';
import { validateUrl } from '../services/ssrf.js';

interface BulkBody {
  emails: string[];
  webhook_url?: string;
}

interface JobParams {
  job_id: string;
}

const bulkRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: BulkBody }>(
    '/v1/validate/bulk',
    {
      schema: {
        body: {
          type: 'object',
          required: ['emails'],
          properties: {
            emails: {
              type: 'array',
              items: { type: 'string', maxLength: 254 },
              minItems: 1,
              maxItems: config.bulk.maxEmails,
            },
            webhook_url: { type: 'string', format: 'uri', maxLength: 2048 },
          },
          additionalProperties: false,
        },
        response: {
          202: {
            type: 'object',
            properties: {
              job_id: { type: 'string' },
              status: { type: 'string' },
              count: { type: 'number' },
            },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { plan } = request.apiKey;
      if (plan === 'free') {
        return reply.status(403).send({ error: 'Bulk validation requires Basic or Pro plan' });
      }

      const { emails, webhook_url } = request.body;

      if (webhook_url) {
        const urlCheck = await validateUrl(webhook_url);
        if (!urlCheck.ok) {
          return reply.status(400).send({
            error: `Invalid webhook_url: ${urlCheck.reason ?? 'rejected by SSRF policy'}`,
          });
        }
      }

      const rawKey = request.headers['x-api-key'] as string;
      const keyHash = hashKey(rawKey);

      const jobId = createBulkJob(keyHash, emails, webhook_url);
      enqueueJob(jobId, keyHash);

      return reply.status(202).send({
        job_id: jobId,
        status: 'queued',
        count: emails.length,
      });
    }
  );

  fastify.get<{ Params: JobParams }>(
    '/v1/jobs/:job_id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['job_id'],
          properties: {
            job_id: { type: 'string', maxLength: 64 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              job_id: { type: 'string' },
              status: { type: 'string' },
              results: { type: 'array' },
              created_at: { type: 'string' },
              completed_at: { type: ['string', 'null'] },
            },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { job_id } = request.params;
      const rawKey = request.headers['x-api-key'] as string;
      const keyHash = hashKey(rawKey);

      const job = getBulkJob(job_id, keyHash);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      return {
        job_id: job.job_id,
        status: job.status,
        results: job.results ?? [],
        created_at: job.created_at,
        completed_at: job.completed_at ?? null,
      };
    }
  );
};

export default bulkRoute;
