import { Router } from 'express';
import { pool } from '../db/pool.js';
import { openApiSpec } from '../openapi/spec.js';
import { metricsRegistry, dbPoolTotal, dbPoolIdle, dbPoolWaiting, queueDepth } from '../metrics.js';
import { bulkLookupQueue } from '../jobs/queue.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'error', error: 'DATABASE_URL not configured' });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch {
    return res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

router.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

// Swagger UI served via CDN — no extra npm package needed
router.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com 'unsafe-inline'",
      "style-src 'self' https://unpkg.com 'unsafe-inline'",
      "img-src 'self' data: https://unpkg.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  );
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Looki API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`);
});

router.get('/metrics', async (_req, res) => {
  // Refresh DB pool gauges before scrape
  if (pool) {
    dbPoolTotal.set(pool.totalCount);
    dbPoolIdle.set(pool.idleCount);
    dbPoolWaiting.set(pool.waitingCount);
  }

  // Refresh BullMQ queue depth gauge before scrape
  if (bulkLookupQueue) {
    try {
      const waiting = await bulkLookupQueue.getWaitingCount();
      queueDepth.set(waiting);
    } catch {
      // Non-fatal — Redis may be unavailable
    }
  }

  try {
    const output = await metricsRegistry.metrics();
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(output);
  } catch {
    res.status(500).end();
  }
});

export default router;
