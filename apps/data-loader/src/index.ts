import 'dotenv/config';
import { Pool } from 'pg';
import { runPipeline } from './pipeline.js';
import { nanpaSource } from './sources/nanpa.js';
import { ofcomSource } from './sources/ofcom.js';
import { acmaSource } from './sources/acma.js';

const DATABASE_URL = process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.error('[data-loader] DATABASE_URL is required');
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await runPipeline([nanpaSource, ofcomSource, acmaSource], pool);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[data-loader] fatal:', err);
  process.exit(1);
});
