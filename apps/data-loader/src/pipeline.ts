import type { Pool } from 'pg';
import { randomUUID } from 'crypto';
import type { DataSource, PrefixRow } from './types.js';

const BATCH_SIZE = 500;

export async function runPipeline(sources: DataSource[], pool: Pool): Promise<void> {
  console.log(`[data-loader] Pipeline starting — ${sources.length} source(s)`);
  for (const source of sources) {
    await loadSource(source, pool);
  }
  console.log('[data-loader] Pipeline complete');
}

async function loadSource(source: DataSource, pool: Pool): Promise<void> {
  const id = randomUUID();
  const startedAt = new Date();
  console.log(`[data-loader] [${source.name}] Starting load for country=${source.countryCode}`);

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO data_loads (id, source, country_code, status, started_at)
       VALUES ($1, $2, $3, 'started', $4)`,
      [id, source.name, source.countryCode, startedAt],
    );

    let rows: PrefixRow[];
    try {
      rows = await source.load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[data-loader] [${source.name}] Load failed: ${msg}`);
      await client.query(
        `UPDATE data_loads SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2`,
        [msg.slice(0, 1000), id],
      );
      return;
    }

    console.log(`[data-loader] [${source.name}] Fetched ${rows.length} rows`);

    if (source.minRows > 0 && rows.length < source.minRows) {
      const msg = `Row count ${rows.length} is below minimum ${source.minRows} — rejecting`;
      console.error(`[data-loader] [${source.name}] ${msg}`);
      await client.query(
        `UPDATE data_loads SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2`,
        [msg, id],
      );
      return;
    }

    if (rows.length === 0) {
      await client.query(
        `UPDATE data_loads SET status = 'success', row_count = 0, finished_at = NOW() WHERE id = $1`,
        [id],
      );
      console.log(`[data-loader] [${source.name}] Stub — 0 rows (success)`);
      return;
    }

    // Create a session-scoped temp staging table (TRUNCATE first for idempotency)
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS prefix_staging (
        country_code  CHAR(2)  NOT NULL,
        prefix        TEXT     NOT NULL,
        prefix_length INTEGER  NOT NULL,
        carrier_name  TEXT,
        carrier_type  TEXT,
        region        TEXT,
        source        TEXT     NOT NULL,
        allocated_at  DATE
      )
    `);
    await client.query('TRUNCATE prefix_staging');

    // Batch insert into staging
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const placeholders = batch
        .map((_, j) => {
          const b = j * 8;
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`;
        })
        .join(',');
      const params = batch.flatMap((r) => [
        r.countryCode,
        r.prefix,
        r.prefix.length,
        r.carrierName,
        r.carrierType,
        r.region,
        r.source,
        r.allocatedAt ?? null,
      ]);
      await client.query(
        `INSERT INTO prefix_staging
           (country_code, prefix, prefix_length, carrier_name, carrier_type, region, source, allocated_at)
         VALUES ${placeholders}`,
        params,
      );
    }

    console.log(`[data-loader] [${source.name}] Staged ${rows.length} rows — swapping into live table`);

    // Atomic swap: delete existing entries for this source+country, then insert from staging
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM prefix_allocations WHERE source = $1 AND country_code = $2`,
      [source.name, source.countryCode],
    );
    const insertResult = await client.query(`
      INSERT INTO prefix_allocations
        (country_code, prefix, prefix_length, carrier_name, carrier_type, region, source, allocated_at)
      SELECT country_code, prefix, prefix_length, carrier_name, carrier_type, region, source, allocated_at
      FROM prefix_staging
      ON CONFLICT (country_code, prefix) DO UPDATE SET
        prefix_length = EXCLUDED.prefix_length,
        carrier_name  = EXCLUDED.carrier_name,
        carrier_type  = EXCLUDED.carrier_type,
        region        = EXCLUDED.region,
        source        = EXCLUDED.source,
        allocated_at  = EXCLUDED.allocated_at,
        loaded_at     = NOW()
    `);
    await client.query('COMMIT');

    const inserted = insertResult.rowCount ?? rows.length;
    console.log(`[data-loader] [${source.name}] Loaded ${inserted} rows into prefix_allocations`);

    await client.query(
      `UPDATE data_loads SET status = 'success', row_count = $1, finished_at = NOW() WHERE id = $2`,
      [rows.length, id],
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[data-loader] [${source.name}] Fatal: ${msg}`);
    await client
      .query(
        `UPDATE data_loads SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2`,
        [msg.slice(0, 1000), id],
      )
      .catch(() => {});
  } finally {
    client.release();
  }
}
