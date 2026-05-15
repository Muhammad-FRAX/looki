import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';

describe('hashPassword', () => {
  it('returns a non-empty string', async () => {
    const hash = await hashPassword('my-secure-password');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('produces different hashes for the same password (argon2 salt)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });

  it('produces an argon2id hash string', async () => {
    const hash = await hashPassword('test-password');
    expect(hash).toMatch(/^\$argon2id\$/);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword(hash, 'correct-password');
    expect(result).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword(hash, 'wrong-password');
    expect(result).toBe(false);
  });

  it('returns false for an empty password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword(hash, '');
    expect(result).toBe(false);
  });

  it('returns false for a password that differs by one character', async () => {
    const hash = await hashPassword('password123');
    const result = await verifyPassword(hash, 'password124');
    expect(result).toBe(false);
  });
});
