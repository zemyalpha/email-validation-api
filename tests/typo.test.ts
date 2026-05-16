import { describe, expect, it } from 'vitest';
import { suggestCorrection } from '../src/services/typo.js';

describe('suggestCorrection', () => {
  it('suggests gmail.com for gmial.com', () => {
    expect(suggestCorrection('user@gmial.com')).toBe('user@gmail.com');
  });

  it('suggests gmail.com for gmai.com', () => {
    expect(suggestCorrection('user@gmai.com')).toBe('user@gmail.com');
  });

  it('suggests hotmail.com for hotmial.com', () => {
    expect(suggestCorrection('user@hotmial.com')).toBe('user@hotmail.com');
  });

  it('suggests yahoo.com for yahooo.com', () => {
    expect(suggestCorrection('user@yahooo.com')).toBe('user@yahoo.com');
  });

  it('returns null when domain is already correct', () => {
    expect(suggestCorrection('user@gmail.com')).toBeNull();
  });

  it('returns null when domain is too different to suggest', () => {
    expect(suggestCorrection('user@totallyunknowndomain.xyz')).toBeNull();
  });

  it('returns null for a malformed email with no @', () => {
    expect(suggestCorrection('notanemail')).toBeNull();
  });

  it('preserves the local part in the suggestion', () => {
    const suggestion = suggestCorrection('alice.smith@gmial.com');
    expect(suggestion).toBe('alice.smith@gmail.com');
  });
});
