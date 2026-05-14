import 'dotenv/config';
import { createApp } from './server.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[looki-api] listening on port ${config.PORT} (${config.NODE_ENV})`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
