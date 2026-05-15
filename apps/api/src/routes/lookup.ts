import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { redisClient } from '../redis/client.js';
import { lookup } from '../lookup/service.js';

// API key auth is enforced in step 6. SKIP_AUTH=true bypasses it for dev/test.

const router = Router();

const querySchema = z.object({
  number: z.string().min(1, 'number query param is required'),
  country: z.string().length(2).optional(),
});

router.get('/lookup', async (req, res) => {
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

  const result = await lookup(
    { number, defaultCountry: country },
    { pool, redis: redisClient ?? undefined },
  );

  if (!result.ok) {
    const status = result.code === 'DB_ERROR' ? 503 : 400;
    return res.status(status).json({
      error: { code: result.code, message: result.message },
    });
  }

  return res.json(result.response);
});

export default router;
