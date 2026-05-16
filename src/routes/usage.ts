import { FastifyPluginAsync } from 'fastify';

const usageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/v1/usage',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              plan: { type: 'string' },
              requests_today: { type: 'number' },
              daily_limit: { type: 'number' },
              resets_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, _reply) => {
      const { plan, requests_today, daily_limit } = request.apiKey;
      const resets = new Date();
      resets.setUTCDate(resets.getUTCDate() + 1);
      resets.setUTCHours(0, 0, 0, 0);

      return {
        plan,
        requests_today,
        daily_limit,
        resets_at: resets.toISOString(),
      };
    }
  );
};

export default usageRoute;
