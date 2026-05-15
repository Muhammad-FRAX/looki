import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../../src/auth/apiKey.js';

describe('generateApiKey', () => {
  it('returns a plaintext key starting with pi_live_', () => {
    const { plaintext } = generateApiKey();
    expect(plaintext).toMatch(/^pi_live_/);
  });

  it('returns a hash that equals hashApiKey(plaintext)', () => {
    const { plaintext, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(plaintext));
  });

  it('returns a prefix of exactly 16 characters', () => {
    const { prefix } = generateApiKey();
    expect(prefix).toHaveLength(16);
  });

  it('prefix is the first 16 characters of plaintext', () => {
    const { plaintext, prefix } = generateApiKey();
    expect(plaintext.startsWith(prefix)).toBe(true);
  });

  it('prefix starts with pi_live_', () => {
    const { prefix } = generateApiKey();
    expect(prefix.startsWith('pi_live_')).toBe(true);
  });

  it('generates unique keys on each call', () => {
    const k1 = generateApiKey();
    const k2 = generateApiKey();
    expect(k1.plaintext).not.toBe(k2.plaintext);
    expect(k1.hash).not.toBe(k2.hash);
  });

  it('plaintext uses only lowercase base32 + pi_live_ prefix characters', () => {
    const { plaintext } = generateApiKey();
    // After the pi_live_ prefix the encoded characters should be alphanumeric (base32 lowercase)
    const encoded = plaintext.slice('pi_live_'.length);
    expect(encoded).toMatch(/^[a-z2-7]+$/);
  });
});

describe('hashApiKey', () => {
  it('produces a 64-character lowercase hex string (SHA-256)', () => {
    const hash = hashApiKey('pi_live_testkey');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input always produces same hash', () => {
    const key = 'pi_live_consistencytest';
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it('produces different hashes for different keys', () => {
    expect(hashApiKey('pi_live_key1')).not.toBe(hashApiKey('pi_live_key2'));
  });
});
