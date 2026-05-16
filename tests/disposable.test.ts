import { describe, expect, it } from 'vitest';
import { isDisposable, isRoleBased } from '../src/services/disposable.js';

describe('isDisposable', () => {
  it('identifies mailinator.com as disposable', () => {
    expect(isDisposable('mailinator.com')).toBe(true);
  });

  it('identifies guerrillamail.com as disposable', () => {
    expect(isDisposable('guerrillamail.com')).toBe(true);
  });

  it('identifies yopmail.com as disposable', () => {
    expect(isDisposable('yopmail.com')).toBe(true);
  });

  it('returns false for gmail.com', () => {
    expect(isDisposable('gmail.com')).toBe(false);
  });

  it('returns false for a legitimate business domain', () => {
    expect(isDisposable('mycompany.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isDisposable('MAILINATOR.COM')).toBe(true);
  });
});

describe('isRoleBased', () => {
  it('identifies admin as role-based', () => {
    expect(isRoleBased('admin')).toBe(true);
  });

  it('identifies noreply as role-based', () => {
    expect(isRoleBased('noreply')).toBe(true);
  });

  it('identifies support as role-based', () => {
    expect(isRoleBased('support')).toBe(true);
  });

  it('returns false for a personal name', () => {
    expect(isRoleBased('alice')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isRoleBased('ADMIN')).toBe(true);
  });
});
