import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { ulid } from 'ulidx';
import { pool } from '../db/pool.js';
import { redisClient } from '../redis/client.js';
import { lookup } from '../lookup/service.js';
import { requireApiKey } from '../auth/apiKey.js';
import { createApiKeyRateLimiter, createBulkApiKeyRateLimiter } from '../middleware/rateLimit.js';
import { writeUsageLog } from '../db/usageLog.js';
import { bulkLookupQueue } from '../jobs/queue.js';

const router = Router();
const apiKeyRateLimiter = createApiKeyRateLimiter();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const querySchema = z.object({
  number: z.string().min(1, 'number query param is required'),
  country: z.string().length(2).optional(),
});

router.get('/lookup', requireApiKey, apiKeyRateLimiter, async (req, res) => {
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
  const startTime = Date.now();

  const result = await lookup(
    { number, defaultCountry: country },
    { pool, redis: redisClient ?? undefined },
  );

  const latencyMs = Date.now() - startTime;
  const statusCode = result.ok ? 200 : (result.code === 'DB_ERROR' ? 503 : 400);

  writeUsageLog(pool, {
    apiKeyId: req.apiKey?.id ?? null,
    userId: req.apiKey?.user_id ?? null,
    endpoint: '/lookup',
    inputNumber: number,
    e164: result.ok ? (result.response.e164 ?? null) : null,
    countryCode: result.ok ? (result.response.country?.code ?? null) : null,
    lineType: result.ok ? result.response.line_type : null,
    cacheHit: result.ok ? result.response.cached : false,
    statusCode,
    latencyMs,
    requestIp: req.ip ?? null,
  }).catch(() => {});

  if (!result.ok) {
    return res.status(statusCode).json({
      error: { code: result.code, message: result.message },
    });
  }

  return res.json(result.response);
});

const bulkBodySchema = z.object({
  numbers: z.array(z.string().min(1)).min(1).max(1000, 'Maximum 1000 numbers per bulk request'),
  country: z.string().length(2).optional(),
});

// Charges numbers.length units from all rate-limit windows (per plan spec)
const bulkRateLimiter = createBulkApiKeyRateLimiter((req) => {
  const parsed = bulkBodySchema.safeParse(req.body);
  return parsed.success ? parsed.data.numbers.length : 1;
});

router.post('/lookup/bulk', requireApiKey, bulkRateLimiter, async (req, res) => {
  const parsed = bulkBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  if (!pool) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
    });
  }

  const { numbers, country } = parsed.data;
  const startTime = Date.now();

  const results = await Promise.all(
    numbers.map((number) =>
      lookup({ number, defaultCountry: country }, { pool, redis: redisClient ?? undefined }),
    ),
  );

  const latencyMs = Date.now() - startTime;

  writeUsageLog(pool, {
    apiKeyId: req.apiKey?.id ?? null,
    userId: req.apiKey?.user_id ?? null,
    endpoint: '/lookup/bulk',
    inputNumber: null,
    e164: null,
    countryCode: country ?? null,
    lineType: null,
    cacheHit: false,
    statusCode: 200,
    latencyMs,
    requestIp: req.ip ?? null,
  }).catch(() => {});

  return res.json(
    results.map((r) =>
      r.ok ? r.response : { error: { code: r.code, message: r.message } },
    ),
  );
});

// ---------------------------------------------------------------------------
// Job queue endpoints
// ---------------------------------------------------------------------------

const jobBodySchema = z.object({
  numbers: z.array(z.string().min(1)).min(1).max(1_000_000, 'Maximum 1,000,000 numbers per job'),
  country: z.string().length(2).optional(),
  webhook_url: z.string().url().optional(),
});

function parseNumbersFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // If comma-separated take first field; strip surrounding quotes
      const first = line.split(',')[0]!.trim().replace(/^"|"$/g, '');
      return first;
    })
    .filter(Boolean);
}

router.post('/lookup/jobs', requireApiKey, upload.single('file'), async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
    });
  }

  if (!bulkLookupQueue) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Job queue not available (Redis required)' },
    });
  }

  let numbers: string[];
  let country: string | undefined;
  let webhookUrl: string | undefined;

  if (req.file) {
    // CSV / plain-text file upload via multipart
    const text = req.file.buffer.toString('utf8');
    numbers = parseNumbersFromText(text);
    country = typeof req.body.country === 'string' ? req.body.country : undefined;
    webhookUrl = typeof req.body.webhook_url === 'string' ? req.body.webhook_url : undefined;

    if (numbers.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Uploaded file contains no valid phone numbers' },
      });
    }
  } else {
    const parsed = jobBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }
    ({ numbers, country, webhook_url: webhookUrl } = parsed.data as {
      numbers: string[];
      country?: string;
      webhook_url?: string;
    });
  }

  const jobId = ulid();

  await pool.query(
    `INSERT INTO jobs (id, user_id, api_key_id, status, total, webhook_url)
     VALUES ($1, $2, $3, 'queued', $4, $5)`,
    [jobId, req.apiKey!.user_id, req.apiKey!.id, numbers.length, webhookUrl ?? null],
  );

  await bulkLookupQueue.add('bulk-lookup', {
    jobId,
    userId: req.apiKey!.user_id,
    apiKeyId: req.apiKey!.id,
    numbers,
    ...(country !== undefined && { defaultCountry: country }),
    ...(webhookUrl !== undefined && { webhookUrl }),
  });

  return res.status(202).json({
    job_id: jobId,
    status: 'queued',
    total: numbers.length,
  });
});

router.get('/lookup/jobs/:job_id', requireApiKey, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
    });
  }

  const { job_id } = req.params as { job_id: string };

  const result = await pool.query<{
    id: string;
    user_id: string;
    status: string;
    total: number;
    processed: number;
    webhook_url: string | null;
    error_message: string | null;
    created_at: string;
    finished_at: string | null;
  }>(
    `SELECT id, user_id, status, total, processed, webhook_url, error_message, created_at, finished_at
     FROM jobs WHERE id = $1`,
    [job_id],
  );

  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
  }

  // Users may only access their own jobs
  if (row.user_id !== req.apiKey!.user_id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  return res.json({
    job_id: row.id,
    status: row.status,
    total: row.total,
    processed: row.processed,
    webhook_url: row.webhook_url,
    error_message: row.error_message,
    created_at: row.created_at,
    finished_at: row.finished_at,
  });
});

router.get('/lookup/jobs/:job_id/result', requireApiKey, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
    });
  }

  const { job_id } = req.params as { job_id: string };

  const result = await pool.query<{
    user_id: string;
    status: string;
    result_path: string | null;
  }>(
    `SELECT user_id, status, result_path FROM jobs WHERE id = $1`,
    [job_id],
  );

  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
  }

  if (row.user_id !== req.apiKey!.user_id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  if (row.status !== 'complete') {
    return res.status(409).json({
      error: {
        code: 'JOB_NOT_COMPLETE',
        message: `Job is ${row.status} — result not yet available`,
      },
    });
  }

  if (!row.result_path) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Result file path not recorded' },
    });
  }

  if (!fs.existsSync(row.result_path)) {
    return res.status(410).json({
      error: { code: 'RESULT_EXPIRED', message: 'Result file no longer available' },
    });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="looki-job-${job_id}.csv"`);
  fs.createReadStream(row.result_path).pipe(res);
});

export default router;
