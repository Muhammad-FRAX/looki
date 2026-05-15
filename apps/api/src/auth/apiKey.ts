import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]!;
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31]!;
  }
  return result.toLowerCase();
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const bytes = crypto.randomBytes(32);
  const encoded = encodeBase32(bytes);
  const plaintext = `pi_live_${encoded}`;
  const hash = hashApiKey(plaintext);
  const prefix = plaintext.slice(0, 16);
  return { plaintext, hash, prefix };
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (config.SKIP_AUTH) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'API key required' } });
    return;
  }

  const key = authHeader.slice(7);
  if (!key.startsWith('pi_live_')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key format' } });
    return;
  }

  if (!pool) {
    res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } });
    return;
  }

  const keyHash = hashApiKey(key);

  pool
    .query<{ id: string; user_id: string; tier: string }>(
      `SELECT id, user_id, tier FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
      [keyHash],
    )
    .then((result) => {
      const row = result.rows[0];
      if (!row) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked API key' } });
        return;
      }
      req.apiKey = row;
      // Update last_used_at asynchronously
      pool!
        .query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id])
        .catch(() => {});
      next();
    })
    .catch(() => {
      res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database error' } });
    });
}
