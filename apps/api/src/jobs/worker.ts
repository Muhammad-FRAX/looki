import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { Worker } from 'bullmq';
import { Pool } from 'pg';
import pino from 'pino';
import { config } from '../config.js';
import type { BulkJobData } from './queue.js';
import { lookup } from '../lookup/service.js';
import type { LookupResponse } from '../lookup/types.js';

const logger = pino({ level: config.NODE_ENV === 'test' ? 'silent' : 'info' });

const BATCH_SIZE = 100;

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    ...(u.password && { password: decodeURIComponent(u.password) }),
    ...(u.username && u.username !== '' && { username: u.username }),
  };
}

function escapeCSV(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_HEADER =
  'input,valid,e164,national_format,international_format,country_code,country_name,calling_code,' +
  'line_type,region,carrier_name,carrier_type,carrier_source,carrier_allocated_at,' +
  'portability_checked,cached,lookup_id\n';

function responseToCSVRow(res: LookupResponse): string {
  return [
    escapeCSV(res.input),
    String(res.valid),
    escapeCSV(res.e164),
    escapeCSV(res.national_format),
    escapeCSV(res.international_format),
    escapeCSV(res.country?.code),
    escapeCSV(res.country?.name),
    escapeCSV(res.country?.calling_code),
    escapeCSV(res.line_type),
    escapeCSV(res.region),
    escapeCSV(res.carrier?.name),
    escapeCSV(res.carrier?.type),
    escapeCSV(res.carrier?.source),
    escapeCSV(res.carrier?.allocated_at),
    String(res.portability?.checked ?? false),
    String(res.cached),
    escapeCSV(res.lookup_id),
  ].join(',') + '\n';
}

function errorToCSVRow(input: string): string {
  return [escapeCSV(input), 'false', '', '', '', '', '', '', '', '', '', '', '', '', 'false', 'false', ''].join(',') + '\n';
}

export function startWorker(): Worker<BulkJobData> | null {
  if (!config.REDIS_URL || !config.DATABASE_URL) {
    logger.warn('[worker] REDIS_URL or DATABASE_URL not set — job worker not started');
    return null;
  }

  const pool = new Pool({ connectionString: config.DATABASE_URL });
  const resultDir = config.JOB_RESULT_PATH;
  fs.mkdirSync(resultDir, { recursive: true });

  const worker = new Worker<BulkJobData>(
    'bulk-lookup',
    async (job) => {
      const { jobId, numbers, defaultCountry, webhookUrl } = job.data;
      logger.info({ jobId, total: numbers.length }, '[worker] Starting job');

      await pool.query(`UPDATE jobs SET status = 'processing' WHERE id = $1`, [jobId]);

      const resultPath = path.join(resultDir, `${jobId}.csv`);
      const stream = fs.createWriteStream(resultPath, { encoding: 'utf8' });
      stream.write(CSV_HEADER);

      let processed = 0;

      for (let i = 0; i < numbers.length; i += BATCH_SIZE) {
        const batch = numbers.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((number) =>
            lookup(
              { number, ...(defaultCountry !== undefined && { defaultCountry }) },
              { pool },
            ),
          ),
        );

        for (let j = 0; j < results.length; j++) {
          const r = results[j]!;
          stream.write(r.ok ? responseToCSVRow(r.response) : errorToCSVRow(batch[j]!));
        }

        processed += batch.length;
        await pool.query(`UPDATE jobs SET processed = $1 WHERE id = $2`, [processed, jobId]);
        await job.updateProgress(Math.floor((processed / numbers.length) * 100));
      }

      await new Promise<void>((resolve, reject) => {
        stream.once('error', reject);
        stream.end(resolve);
      });

      await pool.query(
        `UPDATE jobs SET status = 'complete', result_path = $1, processed = $2, finished_at = NOW() WHERE id = $3`,
        [resultPath, processed, jobId],
      );

      logger.info({ jobId, processed }, '[worker] Job complete');

      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId, status: 'complete', processed }),
        }).catch((err) => logger.warn({ err, jobId }, '[worker] Webhook delivery failed'));
      }
    },
    {
      connection: parseRedisUrl(config.REDIS_URL),
      concurrency: 2,
    },
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { jobId, webhookUrl } = job.data;
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, jobId }, '[worker] Job failed');

    pool
      .query(
        `UPDATE jobs SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2`,
        [message, jobId],
      )
      .catch(() => {});

    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status: 'failed', error: message }),
      }).catch(() => {});
    }
  });

  worker.on('ready', () => {
    logger.info('[worker] BullMQ worker ready, waiting for jobs');
  });

  return worker;
}

// Standalone entry: node dist/jobs/worker.js
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startWorker();
}
