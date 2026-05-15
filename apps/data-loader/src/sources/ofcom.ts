import { parseCSV, col } from '../csv.js';
import type { DataSource, PrefixRow } from '../types.js';

const OFCOM_DATA_URL = process.env['OFCOM_DATA_URL'];

/** Map Ofcom number type string to our line type enum values */
function ofcomLineType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('mobile')) return 'mobile';
  if (t.includes('geographic')) return 'fixed_line';
  if (t.includes('freephone') || t.includes('toll free') || t.includes('toll_free')) return 'toll_free';
  if (t.includes('premium')) return 'premium_rate';
  if (t.includes('voip') || t.includes('voice over')) return 'voip';
  if (t.includes('pager') || t.includes('paging')) return 'pager';
  if (t.includes('shared')) return 'shared_cost';
  if (t.includes('personal')) return 'personal_number';
  return 'unknown';
}

/** Parse Ofcom date formats: DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  return null;
}

/**
 * Extract a clean digit-only prefix from a raw UK number range string.
 * UK national numbers have a leading 0 (trunk prefix) which is stripped.
 * Example: "020 7946 0" → "207946" (without the 0 trunk prefix)
 */
function extractPrefix(raw: string): string | null {
  const digits = raw.replace(/[\s\-\.]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < 2) return null;
  // Strip UK trunk prefix 0
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

/**
 * Find the longest common prefix between two strings.
 * Used to compute a range's representative prefix from From/To bounds.
 */
function commonPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

async function loadOfcom(): Promise<PrefixRow[]> {
  if (!OFCOM_DATA_URL) {
    console.warn('[data-loader] [OFCOM] OFCOM_DATA_URL not set — skipping source');
    return [];
  }

  console.log(`[data-loader] [OFCOM] Downloading from ${OFCOM_DATA_URL}`);
  const response = await fetch(OFCOM_DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const csvRows = parseCSV(text);

  if (csvRows.length === 0) {
    throw new Error('CSV contained no data rows — check OFCOM_DATA_URL and file format');
  }

  const seen = new Map<string, PrefixRow>();

  for (const row of csvRows) {
    // Try various column name conventions used by Ofcom's published datasets
    const fromRaw =
      col(row, 'number', 'from', 'sabc', 'number_range', 'range_start', 'number_range_from', 'sa_bc') ?? '';
    const toRaw = col(row, 'to', 'range_end', 'number_range_to') ?? '';

    const fromDigits = extractPrefix(fromRaw);
    if (!fromDigits || fromDigits.length < 2) continue;

    // Use common prefix of from/to range (or just fromDigits for single numbers)
    const toDigits = toRaw ? extractPrefix(toRaw) : null;
    const prefix =
      toDigits && toDigits.length >= fromDigits.length
        ? commonPrefix(fromDigits, toDigits) || fromDigits
        : fromDigits;

    if (prefix.length < 2) continue;

    const provider =
      col(
        row,
        'communications_provider',
        'provider',
        'company',
        'service_provider',
        'operator',
        'number_holder',
      ) ?? null;
    const typeRaw =
      col(row, 'type_of_number', 'type', 'number_type', 'service_type', 'range_type') ?? '';
    const dateRaw =
      col(
        row,
        'date_of_allotment',
        'date',
        'allotment_date',
        'date_allocated',
        'assignment_date',
        'date_of_allocation',
      ) ?? '';

    seen.set(prefix, {
      countryCode: 'GB',
      prefix,
      carrierName: provider?.trim() || null,
      carrierType: ofcomLineType(typeRaw),
      region: null,
      source: 'OFCOM',
      allocatedAt: parseDate(dateRaw),
    });
  }

  return [...seen.values()];
}

export const ofcomSource: DataSource = {
  name: 'OFCOM',
  countryCode: 'GB',
  minRows: 1000,
  load: loadOfcom,
};
