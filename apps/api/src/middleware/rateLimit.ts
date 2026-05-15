import type { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';
import { ulid } from 'ulidx';
import { redisClient } from '../redis/client.js';
import { config } from '../config.js';

// Lua: sliding window with sorted set. Returns [allowed (1/0), remaining, retry_after_sec]
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms - window_ms)
local count = tonumber(redis.call('ZCARD', key))
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = 60
  if #oldest >= 2 then
    retry = math.ceil((tonumber(oldest[2]) + window_ms - now_ms) / 1000)
  end
  return {0, 0, retry}
end
redis.call('ZADD', key, now_ms, member)
redis.call('PEXPIRE', key, window_ms + 5000)
return {1, limit - count - 1, 0}
`;

// Lua: atomic INCR + EXPIRE on first increment. Returns current count.
const INCR_EXPIRE_LUA = `
local count = tonumber(redis.call('INCR', KEYS[1]))
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return count
`;

async function slidingWindow(
  redis: Redis,
  key: string,
  windowMs: number,
  limit: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const result = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    Date.now().toString(),
    windowMs.toString(),
    limit.toString(),
    ulid(),
  )) as [number, number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    retryAfter: result[2],
  };
}

async function fixedWindow(
  redis: Redis,
  key: string,
  limit: number,
  ttlSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const count = (await redis.eval(
    INCR_EXPIRE_LUA,
    1,
    key,
    ttlSeconds.toString(),
  )) as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function createApiKeyRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.apiKey || !redisClient) {
      next();
      return;
    }

    const keyId = req.apiKey.id;

    try {
      const minResult = await slidingWindow(
        redisClient,
        `rl:min:${keyId}`,
        60_000,
        config.RATE_LIMIT_PER_MINUTE,
      );

      if (!minResult.allowed) {
        res
          .status(429)
          .set('Retry-After', String(minResult.retryAfter))
          .set('X-RateLimit-Limit', String(config.RATE_LIMIT_PER_MINUTE))
          .set('X-RateLimit-Remaining', '0')
          .set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + minResult.retryAfter))
          .json({ error: { code: 'RATE_LIMITED', message: 'Per-minute rate limit exceeded' } });
        return;
      }

      const dayResult = await fixedWindow(
        redisClient,
        `rl:day:${keyId}:${dateKey()}`,
        config.RATE_LIMIT_PER_DAY,
        25 * 3600,
      );

      if (!dayResult.allowed) {
        res
          .status(429)
          .set('Retry-After', '86400')
          .set('X-RateLimit-Limit', String(config.RATE_LIMIT_PER_DAY))
          .set('X-RateLimit-Remaining', '0')
          .set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 86400))
          .json({ error: { code: 'RATE_LIMITED', message: 'Daily rate limit exceeded' } });
        return;
      }

      const monthResult = await fixedWindow(
        redisClient,
        `rl:month:${keyId}:${monthKey()}`,
        config.RATE_LIMIT_PER_MONTH,
        33 * 24 * 3600,
      );

      if (!monthResult.allowed) {
        res
          .status(429)
          .set('Retry-After', '2592000')
          .set('X-RateLimit-Limit', String(config.RATE_LIMIT_PER_MONTH))
          .set('X-RateLimit-Remaining', '0')
          .set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 2592000))
          .json({ error: { code: 'RATE_LIMITED', message: 'Monthly rate limit exceeded' } });
        return;
      }

      res.set('X-RateLimit-Limit', String(config.RATE_LIMIT_PER_MINUTE));
      res.set('X-RateLimit-Remaining', String(minResult.remaining));
      res.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60));
      next();
    } catch {
      // Redis failure is non-fatal — pass the request through
      next();
    }
  };
}

export function createIpRateLimiter(limitPerWindow: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!redisClient) {
      next();
      return;
    }

    const ip = req.ip ?? 'unknown';
    const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `rl:ip:${ip}:${windowSlot}`;

    try {
      const result = await fixedWindow(redisClient, key, limitPerWindow, windowSeconds + 5);

      if (!result.allowed) {
        res
          .status(429)
          .set('Retry-After', String(windowSeconds))
          .json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
        return;
      }

      next();
    } catch {
      next();
    }
  };
}
