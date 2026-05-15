export type LineType =
  | 'mobile'
  | 'fixed_line'
  | 'fixed_line_or_mobile'
  | 'toll_free'
  | 'premium_rate'
  | 'shared_cost'
  | 'voip'
  | 'personal_number'
  | 'pager'
  | 'uan'
  | 'voicemail'
  | 'unknown';

export interface CountryInfo {
  code: string;
  name: string;
  calling_code: string;
}

export interface CarrierInfo {
  name: string;
  type: string;
  source: string;
  allocated_at: string | null;
}

export interface PortabilityInfo {
  checked: boolean;
  note: string;
}

export interface LookupResponse {
  input: string;
  valid: boolean;
  e164: string | null;
  national_format: string | null;
  international_format: string | null;
  country: CountryInfo | null;
  line_type: LineType | null;
  region: string | null;
  carrier: CarrierInfo | null;
  portability: PortabilityInfo;
  cached: boolean;
  lookup_id: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  tier: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ApiKeyCreateResponse {
  key: ApiKey;
  plaintext: string;
}

export interface UsageDay {
  date: string;
  count: number;
}

export interface AdminStats {
  total_users: number;
  total_lookups: number;
  cache_hit_ratio: number;
  queue_depth: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface BulkLookupResponse {
  results: LookupResponse[];
}

export interface JobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  total: number;
  processed: number;
  result_path?: string;
}
