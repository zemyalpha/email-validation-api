// Tests for the real cache service implementation.
// vi.unmock overrides the global mock from setup.ts so we import the real module.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.unmock('../src/services/cache.js');

// Provide a controllable in-memory Redis substitute
vi.mock('ioredis', () => ({ default: vi.fn() }));

import Redis from 'ioredis';
import {
  getCachedResult,
  setCachedResult,
  getDailyCount,
  incrementDailyCount,
  closeRedis,
} from '../src/services/cache.js';
import type { ValidationResult } from '../src/types.js';

const mockRedisInstance = {
  get: vi.fn(),
  setex: vi.fn(),
  pipeline: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
  ping: vi.fn().mockResolvedValue('PONG'),
};

const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expireat: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
};

vi.mocked(Redis).mockImplementation(
  () => mockRedisInstance as unknown as Redis
);

describe('Cache service', () => {
  beforeEach(async () => {
    // Reset the module-level Redis singleton between tests
    await closeRedis();
    vi.clearAllMocks();
    vi.mocked(Redis).mockImplementation(
      () => mockRedisInstance as unknown as Redis
    );
    mockRedisInstance.pipeline.mockReturnValue(mockPipeline);
    mockRedisInstance.quit.mockResolvedValue('OK');
  });

  describe('getCachedResult', () => {
    it('returns null when Redis has no entry for the email', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const result = await getCachedResult('missing@example.com');
      expect(result).toBeNull();
    });

    it('returns a parsed ValidationResult with cached=true', async () => {
      const stored: ValidationResult = {
        email: 'cached@example.com',
        score: 85,
        valid: true,
        checks: {
          syntax: true, mx: true, disposable: false,
          role_based: false, catch_all: false, smtp_exists: 'deliverable',
        },
        suggestion: null,
        cached: false,
      };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(stored));

      const result = await getCachedResult('cached@example.com');
      expect(result).not.toBeNull();
      expect(result!.email).toBe('cached@example.com');
      expect(result!.cached).toBe(true); // flag flipped on retrieval
      expect(result!.score).toBe(85);
    });

    it('returns null and does not throw when Redis errors', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('connection refused'));
      const result = await getCachedResult('fail@example.com');
      expect(result).toBeNull();
    });
  });

  describe('setCachedResult', () => {
    it('calls setex with the correct key prefix and TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      const result: ValidationResult = {
        email: 'store@example.com',
        score: 90,
        valid: true,
        checks: {
          syntax: true, mx: true, disposable: false,
          role_based: false, catch_all: false, smtp_exists: 'deliverable',
        },
        suggestion: null,
        cached: false,
      };
      await setCachedResult(result);
      expect(mockRedisInstance.setex).toHaveBeenCalledOnce();
      const [key, ttl, value] = mockRedisInstance.setex.mock.calls[0] as [string, number, string];
      expect(key).toContain('store@example.com');
      expect(ttl).toBeGreaterThan(0);
      // Stored with cached=false so it can be flipped on retrieval
      expect(JSON.parse(value).cached).toBe(false);
    });

    it('does not throw when Redis setex errors', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('write error'));
      const result: ValidationResult = {
        email: 'fail-store@example.com',
        score: 50,
        valid: true,
        checks: {
          syntax: true, mx: true, disposable: false,
          role_based: false, catch_all: false, smtp_exists: 'unknown',
        },
        suggestion: null,
        cached: false,
      };
      await expect(setCachedResult(result)).resolves.toBeUndefined();
    });
  });

  describe('getDailyCount', () => {
    it('returns 0 when no counter exists', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const count = await getDailyCount('somekey');
      expect(count).toBe(0);
    });

    it('returns parsed integer from Redis', async () => {
      mockRedisInstance.get.mockResolvedValue('42');
      const count = await getDailyCount('somekey');
      expect(count).toBe(42);
    });
  });

  describe('incrementDailyCount', () => {
    it('executes a pipeline with incr and expireat', async () => {
      await incrementDailyCount('somekey');
      expect(mockRedisInstance.pipeline).toHaveBeenCalledOnce();
      expect(mockPipeline.incr).toHaveBeenCalledOnce();
      expect(mockPipeline.expireat).toHaveBeenCalledOnce();
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });
  });
});
