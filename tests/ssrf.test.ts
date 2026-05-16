import { describe, expect, it } from 'vitest';
import { isPrivateIPv4, isPrivateIPv6, validateUrl } from '../src/services/ssrf.js';

describe('isPrivateIPv4', () => {
  it('blocks 127.0.0.1 (loopback)', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
  });

  it('blocks 10.x.x.x', () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.255.255.255')).toBe(true);
  });

  it('blocks 192.168.x.x', () => {
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
  });

  it('blocks 172.16.x.x – 172.31.x.x', () => {
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateIPv4('172.32.0.1')).toBe(false);
  });

  it('blocks 169.254.169.254 (cloud metadata)', () => {
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateIPv4('1.1.1.1')).toBe(false);
  });
});

describe('isPrivateIPv6', () => {
  it('blocks ::1 (loopback)', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
  });

  it('blocks unique-local fc00::/7', () => {
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fd00::1')).toBe(true);
  });

  it('blocks link-local fe80::/10', () => {
    expect(isPrivateIPv6('fe80::1')).toBe(true);
  });

  it('allows public IPv6', () => {
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
  });
});

describe('validateUrl', () => {
  it('rejects URLs with non-http scheme', async () => {
    const r = await validateUrl('ftp://example.com');
    expect(r.ok).toBe(false);
  });

  it('rejects http://127.0.0.1', async () => {
    const r = await validateUrl('http://127.0.0.1/hook');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/private/i);
  });

  it('rejects http://169.254.169.254 (cloud metadata)', async () => {
    const r = await validateUrl('http://169.254.169.254/latest/meta-data');
    expect(r.ok).toBe(false);
  });

  it('rejects http://10.0.0.1', async () => {
    const r = await validateUrl('http://10.0.0.1/hook');
    expect(r.ok).toBe(false);
  });

  it('rejects http://192.168.1.1', async () => {
    const r = await validateUrl('http://192.168.1.1/hook');
    expect(r.ok).toBe(false);
  });

  it('rejects http://localhost', async () => {
    const r = await validateUrl('http://localhost/hook');
    expect(r.ok).toBe(false);
  });

  it('rejects http://metadata.google.internal', async () => {
    const r = await validateUrl('http://metadata.google.internal/v1/');
    expect(r.ok).toBe(false);
  });

  it('rejects malformed URL', async () => {
    const r = await validateUrl('not a url');
    expect(r.ok).toBe(false);
  });

  it('rejects empty input', async () => {
    const r = await validateUrl('');
    expect(r.ok).toBe(false);
  });

  it('accepts a clearly public IP', async () => {
    const r = await validateUrl('https://8.8.8.8/hook');
    expect(r.ok).toBe(true);
  });
});
