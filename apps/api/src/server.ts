import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpRequestsTotal, httpRequestDurationMs } from './metrics.js';
import metaRouter from './routes/meta.js';
import lookupRouter from './routes/lookup.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';

function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    // Normalise dynamic path segments to avoid high cardinality
    const route = req.route?.path ?? req.path ?? 'unknown';
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, Date.now() - start);
  });

  next();
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()),
    credentials: true,
  }));
  app.use(requestId);
  app.use(express.json());
  app.use(pinoHttp({ autoLogging: config.NODE_ENV !== 'test' }));
  app.use(metricsMiddleware);

  app.use('/api/v1', metaRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', meRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1', lookupRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  app.use(errorHandler);

  return app;
}
