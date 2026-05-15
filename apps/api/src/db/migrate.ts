import { fileURLToPath } from 'url';
import path from 'path';
import { runner as pgMigrateRun } from 'node-pg-migrate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

export async function runMigrations(databaseUrl: string): Promise<void> {
  await pgMigrateRun({
    databaseUrl,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => undefined,
  });
}
