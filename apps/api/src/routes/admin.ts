import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { redisClient } from '../redis/client.js';
import { requireJwt, requireAdmin } from '../auth/jwt.js';

const router = Router();

router.get('/admin/stats', requireJwt, requireAdmin, async (_req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  try {
    const [usersResult, lookupsResult, latencyResult, cacheResult] = await Promise.all([
      pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM users'),
      pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM usage_log'),
      pool.query<{ p50: string | null; p95: string | null; p99: string | null }>(
        `SELECT
           ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms))::text AS p50,
           ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))::text AS p95,
           ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms))::text AS p99
         FROM usage_log
         WHERE created_at > NOW() - INTERVAL '24 hours'`,
      ),
      pool.query<{ hits: string; total: string }>(
        `SELECT
           COUNT(CASE WHEN cache_hit THEN 1 END)::text AS hits,
           COUNT(*)::text AS total
         FROM usage_log
         WHERE created_at > NOW() - INTERVAL '24 hours'`,
      ),
    ]);

    const totalLookups = parseInt(lookupsResult.rows[0]?.total ?? '0', 10);
    const totalUsers = parseInt(usersResult.rows[0]?.total ?? '0', 10);
    const cacheRow = cacheResult.rows[0];
    const cacheHits = parseInt(cacheRow?.hits ?? '0', 10);
    const cacheTotalReqs = parseInt(cacheRow?.total ?? '0', 10);
    const cacheHitRatio = cacheTotalReqs > 0 ? cacheHits / cacheTotalReqs : 0;

    const latencyRow = latencyResult.rows[0];

    return res.json({
      stats: {
        total_users: totalUsers,
        total_lookups: totalLookups,
        cache_hit_ratio: Math.round(cacheHitRatio * 1000) / 1000,
        queue_depth: 0,
        latency_24h: {
          p50: latencyRow?.p50 ? parseInt(latencyRow.p50, 10) : null,
          p95: latencyRow?.p95 ? parseInt(latencyRow.p95, 10) : null,
          p99: latencyRow?.p99 ? parseInt(latencyRow.p99, 10) : null,
        },
      },
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } });
  }
});

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/admin/users', requireJwt, requireAdmin, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = usersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
    });
  }

  const { page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  try {
    const [usersResult, countResult] = await Promise.all([
      pool.query<{ id: string; email: string; role: string; created_at: string }>(
        `SELECT id, email, role, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM users'),
    ]);

    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    return res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } });
  }
});

router.post('/admin/data/reload', requireJwt, requireAdmin, async (_req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  try {
    // Flush lookup cache via SCAN (never KEYS)
    if (redisClient) {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', 'lookup:v1:*', 'COUNT', '100');
        cursor = nextCursor;
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
    }

    return res.status(202).json({ status: 'accepted', message: 'Cache flushed. Data reload is scheduled via data-loader.' });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Reload failed' } });
  }
});

export default router;
