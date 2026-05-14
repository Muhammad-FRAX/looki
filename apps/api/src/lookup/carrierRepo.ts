import type { Pool } from 'pg';
import type { CarrierAllocation, CountryInfo } from './types.js';

const LPM_QUERY = `
  SELECT carrier_name, carrier_type, region, source, allocated_at
  FROM prefix_allocations
  WHERE country_code = $1
    AND $2 LIKE prefix || '%'
  ORDER BY prefix_length DESC
  LIMIT 1
`;

const COUNTRY_QUERY = `
  SELECT code, name, calling_code
  FROM countries
  WHERE code = $1
`;

export async function findCarrier(
  pool: Pool,
  countryCode: string,
  nationalNumber: string,
): Promise<CarrierAllocation | null> {
  const result = await pool.query<{
    carrier_name: string | null;
    carrier_type: string | null;
    region: string | null;
    source: string;
    allocated_at: Date | null;
  }>(LPM_QUERY, [countryCode.toUpperCase(), nationalNumber]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0]!;
  return {
    carrierName: row.carrier_name,
    carrierType: row.carrier_type,
    region: row.region,
    source: row.source,
    allocatedAt: row.allocated_at ? row.allocated_at.toISOString().slice(0, 10) : null,
  };
}

export async function findCountry(
  pool: Pool,
  countryCode: string,
): Promise<CountryInfo | null> {
  const result = await pool.query<{ code: string; name: string; calling_code: string }>(
    COUNTRY_QUERY,
    [countryCode.toUpperCase()],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0]!;
  return {
    code: row.code.trim(),
    name: row.name,
    calling_code: row.calling_code,
  };
}
