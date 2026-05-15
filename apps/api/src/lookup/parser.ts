import {
  parsePhoneNumber,
  isValidPhoneNumber,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';
import type { LineType, ParsedNumber } from './types.js';

function mapLineType(raw: ReturnType<PhoneNumber['getType']>): LineType {
  switch (raw) {
    case 'MOBILE':                return 'mobile';
    case 'FIXED_LINE':            return 'fixed_line';
    case 'FIXED_LINE_OR_MOBILE':  return 'fixed_line_or_mobile';
    case 'TOLL_FREE':             return 'toll_free';
    case 'PREMIUM_RATE':          return 'premium_rate';
    case 'SHARED_COST':           return 'shared_cost';
    case 'VOIP':                  return 'voip';
    case 'PERSONAL_NUMBER':       return 'personal_number';
    case 'PAGER':                 return 'pager';
    case 'UAN':                   return 'uan';
    case 'VOICEMAIL':             return 'voicemail';
    default:                      return 'unknown';
  }
}

export interface ParseSuccess {
  ok: true;
  number: ParsedNumber;
}

export interface ParseFailure {
  ok: false;
  reason: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

export function parseNumber(input: string, defaultCountry?: string): ParseResult {
  let phone: PhoneNumber;
  try {
    const country = defaultCountry?.toUpperCase() as CountryCode | undefined;
    phone = parsePhoneNumber(input, country);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Parse error' };
  }

  if (!phone.isValid()) {
    return { ok: false, reason: 'Not a valid phone number' };
  }

  const e164 = phone.format('E.164');
  const callingCode = phone.countryCallingCode;
  const countryIso2 = phone.country ?? '';
  const nationalNumber = phone.nationalNumber;
  const lineType = mapLineType(phone.getType());

  return {
    ok: true,
    number: {
      e164,
      nationalNumber,
      countryIso2,
      callingCode,
      lineType,
      nationalFormat: phone.formatNational(),
      internationalFormat: phone.formatInternational(),
      region: null,
    },
  };
}

export function isValid(input: string, defaultCountry?: string): boolean {
  try {
    return isValidPhoneNumber(input, defaultCountry?.toUpperCase() as CountryCode | undefined);
  } catch {
    return false;
  }
}
