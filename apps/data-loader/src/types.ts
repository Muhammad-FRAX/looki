export interface PrefixRow {
  countryCode: string;
  prefix: string;
  carrierName: string | null;
  carrierType: string | null;
  region: string | null;
  source: string;
  allocatedAt: string | null;
}

export interface DataSource {
  name: string;
  countryCode: string;
  /** Minimum number of rows expected; 0 means stub (skip count validation) */
  minRows: number;
  load: () => Promise<PrefixRow[]>;
}
