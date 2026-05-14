import { Pool } from 'pg';
import { config } from '../config.js';

export const pool: Pool | null = config.DATABASE_URL
  ? new Pool({ connectionString: config.DATABASE_URL })
  : null;
