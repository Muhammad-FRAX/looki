import { parseCSV, col } from '../csv.js';
import type { DataSource, PrefixRow } from '../types.js';

const NANPA_DATA_URL = process.env['NANPA_DATA_URL'];

/** Determine line type from area code semantics */
function nanpaLineType(npa: string): string {
  const n = parseInt(npa, 10);
  if ([800, 833, 844, 855, 866, 877, 888].includes(n)) return 'toll_free';
  if (n === 900 || n === 976) return 'premium_rate';
  if (n === 500) return 'shared_cost';
  if (n === 700) return 'personal_number';
  return 'fixed_line';
}

/** Parse common date formats (MM/DD/YYYY or YYYY-MM-DD) to ISO date string */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1]!.padStart(2, '0')}-${mdy[2]!.padStart(2, '0')}`;
  }
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  return null;
}

async function loadNanpa(): Promise<PrefixRow[]> {
  if (!NANPA_DATA_URL) {
    console.warn('[data-loader] [NANPA] NANPA_DATA_URL not set — skipping source');
    return [];
  }

  console.log(`[data-loader] [NANPA] Downloading from ${NANPA_DATA_URL}`);
  const response = await fetch(NANPA_DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const csvRows = parseCSV(text);

  if (csvRows.length === 0) {
    throw new Error('CSV contained no data rows — check NANPA_DATA_URL and file format');
  }

  // Validate required columns exist in the first row
  const sample = csvRows[0]!;
  const npaVal = col(sample, 'npa', 'area_code', 'areacode', 'npa_nxx');
  const nxxVal = col(sample, 'nxx', 'exchange', 'nxx_x', 'co_code');
  if (npaVal === undefined || nxxVal === undefined) {
    const found = [...sample.keys()].join(', ');
    throw new Error(`Missing NPA/NXX columns in CSV. Found columns: ${found}`);
  }

  // Deduplicate by prefix (keep last occurrence)
  const seen = new Map<string, PrefixRow>();

  for (const row of csvRows) {
    const npa = (col(row, 'npa', 'area_code', 'areacode', 'npa_nxx') ?? '').replace(/\D/g, '');
    const nxx = (col(row, 'nxx', 'exchange', 'nxx_x', 'co_code') ?? '').replace(/\D/g, '');

    if (!/^\d{3}$/.test(npa) || !/^\d{3}$/.test(nxx)) continue;

    const prefix = npa + nxx;
    const company =
      col(row, 'company', 'assignee', 'carrier', 'ocn_company', 'company_name', 'operating_company') ?? null;
    const state =
      col(row, 'state', 'jurisdiction', 'st', 'state_or_province', 'province') ?? null;
    const dateRaw =
      col(row, 'eff_dt', 'effective_date', 'date', 'assignment_date', 'date_assigned', 'eff_date') ?? '';

    seen.set(prefix, {
      countryCode: 'US',
      prefix,
      carrierName: company?.trim() || null,
      carrierType: nanpaLineType(npa),
      region: state?.trim() || null,
      source: 'NANPA',
      allocatedAt: parseDate(dateRaw),
    });
  }

  return [...seen.values()];
}

export const nanpaSource: DataSource = {
  name: 'NANPA',
  countryCode: 'US',
  minRows: 1000,
  load: loadNanpa,
};
