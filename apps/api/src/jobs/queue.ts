import { Queue } from 'bullmq';
import { config } from '../config.js';

export interface BulkJobData {
  jobId: string;
  userId: string;
  apiKeyId: string | null;
  numbers: string[];
  defaultCountry?: string;
  webhookUrl?: string;
}

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    ...(u.password && { password: decodeURIComponent(u.password) }),
    ...(u.username && u.username !== '' && { username: u.username }),
  };
}

export const bulkLookupQueue: Queue<BulkJobData> | null = config.REDIS_URL
  ? new Queue<BulkJobData>('bulk-lookup', {
      connection: parseRedisUrl(config.REDIS_URL),
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
        attempts: 1,
      },
    })
  : null;
