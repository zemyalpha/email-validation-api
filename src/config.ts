export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: 7 * 24 * 60 * 60,
  },
  db: {
    path: process.env.DB_PATH ?? './data/emailvalidation.db',
  },
  dns: {
    timeoutMs: 3000,
  },
  bulk: {
    maxEmails: 100,
    concurrency: 5,
  },
  billing: {
    tiers: {
      free:  { priceMonthly: 0,     requestsPerDay: 50,    overagePerRequest: 0.01 },
      basic: { priceMonthly: 14.99, requestsPerDay: 1000,  overagePerRequest: 0.01 },
      pro:   { priceMonthly: 79,    requestsPerDay: 10000, overagePerRequest: 0.01 },
    },
    stripe: {
      secretKey:     process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      priceBasic:    process.env.STRIPE_PRICE_BASIC ?? '',
      pricePro:      process.env.STRIPE_PRICE_PRO ?? '',
      successUrl:    process.env.STRIPE_SUCCESS_URL ?? 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl:     process.env.STRIPE_CANCEL_URL ?? 'https://example.com/cancel',
    },
  },
  rapidApi: {
    proxySecret: process.env.RAPIDAPI_PROXY_SECRET ?? '',
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
