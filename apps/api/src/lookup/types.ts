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

export interface ParsedNumber {
  e164: string;
  nationalNumber: string;
  countryIso2: string;
  callingCode: string;
  lineType: LineType;
  nationalFormat: string;
  internationalFormat: string;
  region: string | null;
}

export interface CarrierAllocation {
  carrierName: string | null;
  carrierType: string | null;
  region: string | null;
  source: string;
  allocatedAt: string | null;
}

export interface LookupError {
  code: 'INVALID_NUMBER' | 'PARSE_ERROR' | 'DB_ERROR';
  message: string;
}
