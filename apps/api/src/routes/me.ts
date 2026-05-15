import { Router } from 'express';
import { z } from 'zod';
import { ulid } from 'ulidx';
import { pool } from '../db/pool.js';
import { requireJwt } from '../auth/jwt.js';
import { generateApiKey } from '../auth/apiKey.js';

const router = Router();

router.get('/me', requireJwt, async (req, res) => {
  if (!pool || !req.user) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  try {
    const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user.id],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } });
  }
});

router.get('/me/keys', requireJwt, async (req, res) => {
  if (!pool || !req.user) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  try {
    const result = await pool.query<{
      id: string;
      name: string;
      key_prefix: string;
      tier: string;
      last_used_at: string | null;
      created_at: string;
    }>(
      `SELECT id, name, key_prefix, tier, last_used_at, created_at
       FROM api_keys
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    return res.json({ keys: result.rows });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch API keys' } });
  }
});

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

router.post('/me/keys', requireJwt, async (req, res) => {
  if (!pool || !req.user) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten().fieldErrors },
    });
  }

  try {
    const { plaintext, hash, prefix } = generateApiKey();
    const id = ulid();

    await pool.query(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, parsed.data.name, hash, prefix],
    );

    return res.status(201).json({
      key: {
        id,
        name: parsed.data.name,
        key_prefix: prefix,
        tier: 'free',
        created_at: new Date().toISOString(),
        // plaintext returned exactly once
        plaintext,
      },
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
  }
});

router.delete('/me/keys/:key_id', requireJwt, async (req, res) => {
  if (!pool || !req.user) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const keyId = req.params['key_id'];
  if (!keyId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'key_id required' } });
  }

  try {
    const result = await pool.query(
      `UPDATE api_keys SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [keyId, req.user.id],
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } });
  }
});

const usageQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/me/usage', requireJwt, async (req, res) => {
  if (!pool || !req.user) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = usageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
    });
  }

  const { from, to } = parsed.data;

  try {
    const result = await pool.query<{ date: string; count: string }>(
      `SELECT DATE(created_at)::text AS date, COUNT(*)::text AS count
       FROM usage_log
       WHERE user_id = $1
         AND ($2::date IS NULL OR DATE(created_at) >= $2::date)
         AND ($3::date IS NULL OR DATE(created_at) <= $3::date)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`,
      [req.user.id, from ?? null, to ?? null],
    );

    return res.json({
      usage: result.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch usage' } });
  }
});

export default router;
