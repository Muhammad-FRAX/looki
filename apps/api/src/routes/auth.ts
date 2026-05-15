import { Router } from 'express';
import { z } from 'zod';
import { ulid } from 'ulidx';
import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const loginLimiter = createIpRateLimiter(10, 3600);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

async function createTokenPair(
  userId: string,
  role: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const accessToken = signAccessToken(userId, role);
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(userId);

  await pool!.query(
    `INSERT INTO refresh_tokens (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [jti, userId, expiresAt],
  );

  return { access_token: accessToken, refresh_token: refreshToken };
}

router.post('/auth/register', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten().fieldErrors },
    });
  }

  const { email, password } = parsed.data;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }

    const passwordHash = await hashPassword(password);
    const id = ulid();
    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`,
      [id, email, passwordHash],
    );

    const tokens = await createTokenPair(id, 'user');
    return res.status(201).json({
      ...tokens,
      user: { id, email, role: 'user' },
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
  }
});

router.post('/auth/login', loginLimiter, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten().fieldErrors },
    });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query<{ id: string; role: string; password_hash: string }>(
      'SELECT id, role, password_hash FROM users WHERE email = $1',
      [email],
    );

    const user = result.rows[0];
    const valid = user ? await verifyPassword(user.password_hash, password) : false;

    if (!user || !valid) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const tokens = await createTokenPair(user.id, user.role);
    return res.json({
      ...tokens,
      user: { id: user.id, email, role: user.role },
    });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
});

router.post('/auth/refresh', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
  }

  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refresh_token required' } });
  }

  try {
    const payload = verifyRefreshToken(parsed.data.refresh_token);

    const result = await pool.query<{ user_id: string; role: string }>(
      `SELECT rt.user_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.id = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [payload.jti],
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Refresh token invalid or expired' } });
    }

    const accessToken = signAccessToken(row.user_id, row.role);
    return res.json({ access_token: accessToken });
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Refresh token invalid or expired' } });
  }
});

router.post('/auth/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success || !pool) {
    return res.status(204).end();
  }

  try {
    const payload = verifyRefreshToken(parsed.data.refresh_token);
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [payload.jti],
    );
  } catch {
    // Ignore errors — logout should always succeed from client perspective
  }

  return res.status(204).end();
});

export default router;
