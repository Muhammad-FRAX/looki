import type { Pool } from 'pg';
import { ulid } from 'ulidx';

export interface UsageLogEntry {
  apiKeyId: string | null;
  userId: string | null;
  endpoint: string;
  inputNumber: string | null;
  e164: string | null;
  countryCode: string | null;
  lineType: string | null;
  cacheHit: boolean;
  statusCode: number;
  latencyMs: number;
  requestIp: string | null;
}

export async function writeUsageLog(pool: Pool, entry: UsageLogEntry): Promise<void> {
  await pool.query(
    `INSERT INTO usage_log (
      id, api_key_id, user_id, endpoint, input_number, e164,
      country_code, line_type, cache_hit, status_code, latency_ms, request_ip
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      ulid(),
      entry.apiKeyId,
      entry.userId,
      entry.endpoint,
      entry.inputNumber,
      entry.e164,
      entry.countryCode,
      entry.lineType,
      entry.cacheHit,
      entry.statusCode,
      entry.latencyMs,
      entry.requestIp,
    ],
  );
}
