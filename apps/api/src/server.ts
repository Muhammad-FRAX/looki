import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import metaRouter from './routes/meta.js';
import lookupRouter from './routes/lookup.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';

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
