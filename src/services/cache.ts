import Redis from 'ioredis';
import { config } from '../config.js';
import { ValidationResult } from '../types.js';
import { logger } from './logger.js';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      // Password is set separately so it works whether or not the URL embeds credentials
      ...(config.redis.password ? { password: config.redis.password } : {}),
    });
    client.on('error', (err: Error) => {
      logger.error({ err: err.message }, '[redis] connection error');
    });
  }
  return client;
}

const EMAIL_KEY_PREFIX = 'ev:email:';
const DAILY_COUNTER_PREFIX = 'ev:daily:';

export async function getCachedResult(email: string): Promise<ValidationResult | null> {
  try {
    const key = EMAIL_KEY_PREFIX + email.toLowerCase();
    const raw = await getRedis().get(key);
    if (!raw) return null;
    const result = JSON.parse(raw) as ValidationResult;
    result.cached = true;
    return result;
  } catch {
    return null;
  }
}

export async function setCachedResult(result: ValidationResult): Promise<void> {
  try {
    const key = EMAIL_KEY_PREFIX + result.email.toLowerCase();
    const toStore = { ...result, cached: false };
    await getRedis().setex(key, config.redis.ttl, JSON.stringify(toStore));
  } catch {
    // Cache failures are non-fatal
  }
}

export async function getDailyCount(keyHash: string): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${DAILY_COUNTER_PREFIX}${keyHash}:${today}`;
    const val = await getRedis().get(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementDailyCount(keyHash: string): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${DAILY_COUNTER_PREFIX}${keyHash}:${today}`;
    const pipeline = getRedis().pipeline();
    pipeline.incr(key);
    pipeline.expireat(key, endOfDayTimestamp());
    await pipeline.exec();
  } catch {
    // Non-fatal
  }
}

function endOfDayTimestamp(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.floor(end.getTime() / 1000);
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
