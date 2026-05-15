import type { Redis } from 'ioredis';
import type { LookupResponse } from './types.js';

const KEY_PREFIX = 'lookup:v1:';
const TTL_SECONDS = 24 * 60 * 60;

export async function getCachedLookup(
  redis: Redis,
  e164: string,
): Promise<LookupResponse | null> {
  const raw = await redis.get(KEY_PREFIX + e164);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LookupResponse;
  } catch {
    return null;
  }
}

export async function setCachedLookup(
  redis: Redis,
  e164: string,
  response: LookupResponse,
): Promise<void> {
  await redis.set(KEY_PREFIX + e164, JSON.stringify(response), 'EX', TTL_SECONDS);
}
