import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { redisClient } from '../redis/client.js';
import { lookup } from '../lookup/service.js';
import { requireApiKey } from '../auth/apiKey.js';
import { createApiKeyRateLimiter } from '../middleware/rateLimit.js';
import { writeUsageLog } from '../db/usageLog.js';

const router = Router();
const apiKeyRateLimiter = createApiKeyRateLimiter();

const querySchema = z.object({
  number: z.string().min(1, 'number query param is required'),
  country: z.string().length(2).optional(),
});

router.get('/lookup', requireApiKey, apiKeyRateLimiter, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  if (!pool) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
    });
  }

  const { number, country } = parsed.data;
  const startTime = Date.now();

  const result = await lookup(
    { number, defaultCountry: country },
    { pool, redis: redisClient ?? undefined },
  );

  const latencyMs = Date.now() - startTime;
  const statusCode = result.ok ? 200 : (result.code === 'DB_ERROR' ? 503 : 400);

  writeUsageLog(pool, {
    apiKeyId: req.apiKey?.id ?? null,
    userId: req.apiKey?.user_id ?? null,
    endpoint: '/lookup',
    inputNumber: number,
    e164: result.ok ? (result.response.e164 ?? null) : null,
    countryCode: result.ok ? (result.response.country?.code ?? null) : null,
    lineType: result.ok ? result.response.line_type : null,
    cacheHit: result.ok ? result.response.cached : false,
    statusCode,
    latencyMs,
    requestIp: req.ip ?? null,
  }).catch(() => {});

  if (!result.ok) {
    return res.status(statusCode).json({
      error: { code: result.code, message: result.message },
    });
  }

  return res.json(result.response);
});

export default router;
