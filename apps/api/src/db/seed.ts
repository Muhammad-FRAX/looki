import argon2 from 'argon2';
import { ulid } from 'ulidx';
import type { Pool } from 'pg';
import { config } from '../config.js';

export async function seedAdminIfMissing(pool: Pool): Promise<'created' | 'exists' | 'skipped'> {
  const email = config.ADMIN_EMAIL;
  const password = config.ADMIN_PASSWORD;

  if (!email || !password) {
    return 'skipped';
  }

  const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
  if ((existing.rowCount ?? 0) > 0) {
    return 'exists';
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const id = ulid();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [id, email, hash, 'admin'],
  );

  return 'created';
}
