import { describe, expect, it, vi } from 'vitest';
import { checkSyntax, validateEmail } from '../src/services/validation.js';

vi.mock('../src/services/dns.js', () => ({
  hasMxRecords: vi.fn().mockResolvedValue(true),
  isCatchAll: vi.fn().mockResolvedValue(false),
}));

describe('checkSyntax', () => {
  it('accepts a standard valid email', () => {
    expect(checkSyntax('user@example.com')).toBe(true);
  });

  it('accepts a subdomain email', () => {
    expect(checkSyntax('user@mail.example.co.uk')).toBe(true);
  });

  it('accepts plus-addressed emails', () => {
    expect(checkSyntax('user+tag@example.com')).toBe(true);
  });

  it('rejects email missing @', () => {
    expect(checkSyntax('notanemail')).toBe(false);
  });

  it('rejects email missing domain', () => {
    expect(checkSyntax('user@')).toBe(false);
  });

  it('rejects email missing local part', () => {
    expect(checkSyntax('@example.com')).toBe(false);
  });

  it('rejects email longer than 254 chars', () => {
    expect(checkSyntax('a'.repeat(250) + '@b.co')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('returns full result structure', async () => {
    const result = await validateEmail('alice@example.com');
    expect(result).toMatchObject({
      email: 'alice@example.com',
      score: expect.any(Number),
      valid: expect.any(Boolean),
      checks: {
        syntax: expect.any(Boolean),
        mx: expect.any(Boolean),
        disposable: expect.any(Boolean),
        role_based: expect.any(Boolean),
        catch_all: expect.any(Boolean),
      },
      cached: false,
    });
  });

  it('marks disposable email domains correctly', async () => {
    const result = await validateEmail('user@guerrillamail.com');
    expect(result.checks.disposable).toBe(true);
  });

  it('marks role-based addresses correctly', async () => {
    const result = await validateEmail('noreply@example.com');
    expect(result.checks.role_based).toBe(true);
  });

  it('score is below 50 for completely invalid email', async () => {
    const result = await validateEmail('not-valid');
    expect(result.score).toBeLessThan(50);
    expect(result.valid).toBe(false);
  });

  it('normalizes email to lowercase', async () => {
    const result = await validateEmail('USER@EXAMPLE.COM');
    expect(result.email).toBe('user@example.com');
  });
});
