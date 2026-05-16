import Stripe from 'stripe';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { upgradeApiKeyPlanByUserId } from '../services/database.js';
import { ApiKey } from '../types.js';

interface CheckoutBody {
  plan: 'basic' | 'pro';
}

interface StripeEvent {
  type: string;
  data: {
    object: {
      metadata?: {
        user_id?: string;
        plan?: string;
      };
    };
  };
}

const billingRoute: FastifyPluginAsync = async (fastify) => {
  // Capture raw body for Stripe webhook signature verification.
  // Scoped to this plugin only — does not affect other routes.
  fastify.decorateRequest('rawBody', null);
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      done(null, JSON.parse((body as Buffer).toString()));
    } catch (err) {
      done(err as Error);
    }
  });

  fastify.post<{ Body: CheckoutBody }>(
    '/v1/billing/checkout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['plan'],
          properties: {
            plan: { type: 'string', enum: ['basic', 'pro'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { plan } = request.body;
      const { secretKey, priceBasic, pricePro } = config.billing.stripe;

      if (!secretKey) {
        return reply.status(503).send({ error: 'Payment processing not configured' });
      }

      const priceId = plan === 'pro' ? pricePro : priceBasic;
      if (!priceId) {
        return reply.status(503).send({ error: `Stripe price ID for ${plan} plan not configured` });
      }

      try {
        const { successUrl, cancelUrl } = config.billing.stripe;
        const params = new URLSearchParams({
          mode: 'subscription',
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          success_url: successUrl,
          cancel_url: cancelUrl,
          'metadata[user_id]': request.apiKey.user_id,
          'metadata[plan]': plan,
        });

        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const err = await response.json() as { error?: { message?: string } };
          return reply.status(502).send({
            error: 'Stripe checkout creation failed',
            detail: err?.error?.message ?? 'Unknown error',
          });
        }

        const session = await response.json() as { url: string };
        return reply.send({ url: session.url });
      } catch (err) {
        fastify.log.error(err, 'Stripe checkout error');
        return reply.status(502).send({ error: 'Failed to create checkout session' });
      }
    }
  );

  fastify.post(
    '/v1/billing/webhook',
    { config: { skipAuth: true } },
    async (request, reply) => {
      try {
        const { secretKey, webhookSecret } = config.billing.stripe;
        let event: StripeEvent;

        if (webhookSecret) {
          const sig = request.headers['stripe-signature'];
          if (!sig) {
            return reply.status(400).send({ error: 'Missing Stripe-Signature header' });
          }
          const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;
          const stripe = new Stripe(secretKey);
          try {
            event = stripe.webhooks.constructEvent(
              rawBody,
              sig,
              webhookSecret
            ) as unknown as StripeEvent;
          } catch {
            return reply.status(400).send({ error: 'Webhook signature verification failed' });
          }
        } else {
          event = request.body as StripeEvent;
        }

        if (event?.type === 'checkout.session.completed') {
          const session = event.data?.object;
          const userId = session?.metadata?.user_id;
          const plan = session?.metadata?.plan as ApiKey['plan'] | undefined;

          if (userId && plan && ['basic', 'pro'].includes(plan)) {
            upgradeApiKeyPlanByUserId(userId, plan);
          }
        }

        return reply.send({ received: true });
      } catch (err) {
        fastify.log.error(err, 'Webhook processing error');
        return reply.status(400).send({ error: 'Webhook processing failed' });
      }
    }
  );
};

export default billingRoute;
