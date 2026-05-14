import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { ulid } from 'ulidx';
import { parseNumber } from './parser.js';
import { findCarrier, findCountry } from './carrierRepo.js';
import { getCachedLookup, setCachedLookup } from './cache.js';
import { NullPortabilityProvider, type PortabilityProvider } from './portability.js';
import type { LookupResponse, CarrierInfo, CountryInfo } from './types.js';

const PORTABILITY_NOTE =
  'Real-time portability requires a paid upstream. Returned carrier is the original allocation.';

export interface LookupOptions {
  pool: Pool;
  portability?: PortabilityProvider;
  redis?: Redis;
}

export interface LookupInput {
  number: string;
  defaultCountry?: string;
}

export type LookupResult =
  | { ok: true; response: LookupResponse }
  | { ok: false; code: 'INVALID_NUMBER' | 'DB_ERROR'; message: string };

export async function lookup(
  input: LookupInput,
  opts: LookupOptions,
): Promise<LookupResult> {
  const { pool, portability = new NullPortabilityProvider(), redis } = opts;

  const parsed = parseNumber(input.number, input.defaultCountry);

  if (!parsed.ok) {
    return {
      ok: true,
      response: {
        input: input.number,
        valid: false,
        e164: null,
        national_format: null,
        international_format: null,
        country: null,
        line_type: null,
        region: null,
        carrier: null,
        portability: { checked: false, note: PORTABILITY_NOTE },
        cached: false,
        lookup_id: ulid(),
      },
    };
  }

  const { number } = parsed;

  // Check Redis cache before hitting the database
  if (redis) {
    try {
      const hit = await getCachedLookup(redis, number.e164);
      if (hit) {
        return { ok: true, response: { ...hit, cached: true, lookup_id: ulid() } };
      }
    } catch {
      // Cache failure is non-fatal — fall through to DB
    }
  }

  let country: CountryInfo | null = null;
  let carrierInfo: CarrierInfo | null = null;
  let carrierRegion: string | null = null;

  try {
    const [countryRow, allocation] = await Promise.all([
      findCountry(pool, number.countryIso2),
      findCarrier(pool, number.countryIso2, number.nationalNumber),
    ]);

    country = countryRow;

    if (allocation) {
      carrierRegion = allocation.region;
      carrierInfo = {
        name: allocation.carrierName ?? '',
        type: allocation.carrierType ?? '',
        source: allocation.source,
        allocated_at: allocation.allocatedAt,
      };
    }
  } catch (err) {
    return {
      ok: false,
      code: 'DB_ERROR',
      message: err instanceof Error ? err.message : 'Database error',
    };
  }

  const portResult = await portability.lookup(number.e164);

  const response: LookupResponse = {
    input: input.number,
    valid: true,
    e164: number.e164,
    national_format: number.nationalFormat,
    international_format: number.internationalFormat,
    country,
    line_type: number.lineType,
    region: carrierRegion ?? number.region,
    carrier: carrierInfo,
    portability: portResult
      ? { checked: true, note: PORTABILITY_NOTE }
      : { checked: false, note: PORTABILITY_NOTE },
    cached: false,
    lookup_id: ulid(),
  };

  // Store in cache (non-fatal on failure)
  if (redis) {
    setCachedLookup(redis, number.e164, response).catch(() => {});
  }

  return { ok: true, response };
}
