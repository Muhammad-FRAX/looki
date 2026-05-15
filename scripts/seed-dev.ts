import { config as loadDotenv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import argon2 from 'argon2';
import { ulid } from 'ulidx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadDotenv({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });
loadDotenv({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env['DATABASE_URL'];
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@looki.local';
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'admin123';

if (!DATABASE_URL) {
  console.error('[seed-dev] DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE email = $1',
    [ADMIN_EMAIL],
  );

  if ((existing.rowCount ?? 0) > 0) {
    const row = existing.rows[0]!;
    if (row.role !== 'admin') {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', row.id]);
      console.log(`[seed-dev] promoted existing user ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`[seed-dev] admin user ${ADMIN_EMAIL} already exists`);
    }
  } else {
    const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
    const id = ulid();
    await pool.query(
      'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [id, ADMIN_EMAIL, passwordHash, 'admin'],
    );
    console.log(`[seed-dev] created admin user ${ADMIN_EMAIL}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('[seed-dev] fatal:', err);
  process.exit(1);
});
