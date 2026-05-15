export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface LookupResponse {
  input: string;
  valid: boolean;
  e164: string;
  national_format: string;
  international_format: string;
  country: {
    code: string;
    name: string;
    calling_code: string;
  } | null;
  line_type: string;
  region: string | null;
  carrier: {
    name: string;
    type: string;
    source: string;
    allocated_at: string | null;
  } | null;
  portability: {
    checked: boolean;
    note: string;
  };
  cached: boolean;
  lookup_id: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  tier: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface UsageEntry {
  date: string;
  count: number;
}

export interface AdminStats {
  total_users: number;
  total_lookups: number;
  cache_hit_ratio: number;
  queue_depth: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}
