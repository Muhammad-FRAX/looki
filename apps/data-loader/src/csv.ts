function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses a CSV string into an array of row maps.
 * Keys are header names, lowercased and with non-alphanumeric chars replaced by _.
 */
export function parseCSV(raw: string): Map<string, string>[] {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]!).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
  );

  const rows: Map<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]!);
    const row = new Map<string, string>();
    headers.forEach((h, idx) => {
      row.set(h, (values[idx] ?? '').trim());
    });
    rows.push(row);
  }
  return rows;
}

/** Returns the value for the first matching column key, or undefined. */
export function col(row: Map<string, string>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    const v = row.get(c);
    if (v !== undefined) return v;
  }
  return undefined;
}
