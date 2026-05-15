import Redis from 'ioredis';
import { config } from '../config.js';

function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('error', (err: Error) => {
    process.stderr.write(`[redis] ${err.message}\n`);
  });

  return client;
}

export const redisClient: Redis | null = config.REDIS_URL
  ? createRedisClient(config.REDIS_URL)
  : null;
