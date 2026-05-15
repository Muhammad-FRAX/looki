import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16).default('change-me-access'),
  JWT_REFRESH_SECRET: z.string().min(16).default('change-me-refresh'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_PER_DAY: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_PER_MONTH: z.coerce.number().int().positive().default(10000),
  DEMO_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
  JOB_RESULT_PATH: z.string().default('/tmp/looki-jobs'),
  SKIP_AUTH: z.string().optional().transform((v) => v === 'true' || v === '1'),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.flatten());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
