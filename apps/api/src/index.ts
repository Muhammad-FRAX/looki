import 'dotenv/config';
import cron from 'node-cron';
import { createApp } from './server.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { redisClient } from './redis/client.js';
import { startWorker } from './jobs/worker.js';
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

  // Start built-in BullMQ worker (scales out via dedicated worker container in production)
  startWorker();

  const server = app.listen(config.PORT, () => {
    logger.info(`[looki-api] listening on port ${config.PORT} (${config.NODE_ENV})`);
  });

  // Monthly data reload: 2nd of each month at 03:00 UTC — flush lookup cache so fresh
  // prefix data is served immediately after the operator runs the data-loader container.
  cron.schedule('0 3 2 * *', async () => {
    logger.info('[cron] Monthly data reload — flushing lookup cache');
    if (redisClient) {
      try {
        let cursor = '0';
        let deleted = 0;
        do {
          const [next, keys] = await redisClient.scan(cursor, 'MATCH', 'lookup:v1:*', 'COUNT', '100');
          cursor = next;
          if (keys.length > 0) {
            await redisClient.del(...keys);
            deleted += keys.length;
          }
        } while (cursor !== '0');
        logger.info({ deleted }, '[cron] Cache flush complete');
      } catch (err) {
        logger.error({ err }, '[cron] Cache flush failed');
      }
    }
    logger.info('[cron] Run `docker compose run --profile loader data-loader` to reload prefix data');
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
