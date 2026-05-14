import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/ready', (_req, res) => {
  // In step 1 we just return ok; later steps will verify DB + Redis connectivity.
  res.json({ status: 'ok' });
});

export default router;
