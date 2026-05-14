import 'dotenv/config';
import { createApp } from './server.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import pino from 'pino';

const logger = pino({ level: config.NODE_ENV === 'test' ? 'silent' : 'info' });

async function start() {
  if (config.DATABASE_URL) {
    try {
      logger.info('Running database migrations…');
      await runMigrations(config.DATABASE_URL);
      logger.info('Migrations complete.');
    } catch (err) {
      logger.error({ err }, 'Migration failed — aborting startup');
      process.exit(1);
    }
  } else {
    logger.warn('DATABASE_URL not set — skipping migrations');
  }

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`[looki-api] listening on port ${config.PORT} (${config.NODE_ENV})`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool?.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
