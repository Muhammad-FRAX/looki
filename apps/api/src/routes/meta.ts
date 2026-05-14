import { Router } from 'express';
import { pool } from '../db/pool.js';

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

export default router;
