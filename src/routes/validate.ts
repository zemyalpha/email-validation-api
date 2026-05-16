import { FastifyPluginAsync } from 'fastify';
import { validateEmail } from '../services/validation.js';

interface ValidateBody {
  email: string;
}

const CHECKS_SCHEMA = {
  type: 'object',
  properties: {
    syntax: { type: 'boolean' },
    mx: { type: 'boolean' },
    disposable: { type: 'boolean' },
    role_based: { type: 'boolean' },
    catch_all: { type: 'boolean' },
    smtp_exists: { type: 'string', enum: ['deliverable', 'undeliverable', 'unknown'] },
  },
};

const VALIDATION_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    score: { type: 'number' },
    valid: { type: 'boolean' },
    checks: CHECKS_SCHEMA,
    suggestion: { type: ['string', 'null'] },
    cached: { type: 'boolean' },
  },
};

const validateRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: ValidateBody }>(
    '/v1/validate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', maxLength: 254 },
          },
          additionalProperties: false,
        },
        response: {
          200: VALIDATION_RESULT_SCHEMA,
        },
      },
    },
    async (request, _reply) => {
      const { email } = request.body;
      return validateEmail(email);
    }
  );
};

export { VALIDATION_RESULT_SCHEMA };
export default validateRoute;
