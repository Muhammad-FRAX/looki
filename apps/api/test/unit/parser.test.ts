import { describe, it, expect } from 'vitest';
import { parseNumber, isValid } from '../../src/lookup/parser.js';

describe('parseNumber', () => {
  describe('valid numbers', () => {
    it('parses a US E.164 number', () => {
      const result = parseNumber('+12125550123');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.e164).toBe('+12125550123');
      expect(result.number.countryIso2).toBe('US');
      expect(result.number.callingCode).toBe('1');
      expect(result.number.nationalNumber).toBe('2125550123');
    });

    it('parses a UK number in E.164 format', () => {
      const result = parseNumber('+447700900000');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.e164).toBe('+447700900000');
      expect(result.number.countryIso2).toBe('GB');
      expect(result.number.callingCode).toBe('44');
    });

    it('parses an Australian number in E.164 format', () => {
      const result = parseNumber('+61412345678');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.e164).toBe('+61412345678');
      expect(result.number.countryIso2).toBe('AU');
      expect(result.number.callingCode).toBe('61');
    });

    it('parses a national US number with default country hint', () => {
      const result = parseNumber('2125550123', 'US');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.e164).toBe('+12125550123');
    });

    it('parses a German number', () => {
      const result = parseNumber('+4930123456');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.countryIso2).toBe('DE');
      expect(result.number.callingCode).toBe('49');
    });

    it('includes national and international formats', () => {
      const result = parseNumber('+12125550123');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.number.nationalFormat).toBeTruthy();
      expect(result.number.internationalFormat).toBeTruthy();
      expect(result.number.internationalFormat).toContain('+1');
    });
  });

  describe('line type detection', () => {
    it('detects a US number as fixed_line or mobile', () => {
      const result = parseNumber('+12125550123');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(['fixed_line', 'fixed_line_or_mobile', 'unknown']).toContain(result.number.lineType);
    });

    it('returns a valid LineType string', () => {
      const validTypes = [
        'mobile', 'fixed_line', 'fixed_line_or_mobile', 'toll_free',
        'premium_rate', 'shared_cost', 'voip', 'personal_number',
        'pager', 'uan', 'voicemail', 'unknown',
      ];
      const result = parseNumber('+447700900000');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(validTypes).toContain(result.number.lineType);
    });
  });

  describe('invalid numbers', () => {
    it('returns ok=false for a clearly invalid number', () => {
      const result = parseNumber('not-a-number');
      expect(result.ok).toBe(false);
    });

    it('returns ok=false for an empty string', () => {
      const result = parseNumber('');
      expect(result.ok).toBe(false);
    });

    it('returns ok=false for a number that is too short', () => {
      const result = parseNumber('+123');
      expect(result.ok).toBe(false);
    });

    it('includes a reason string on failure', () => {
      const result = parseNumber('not-a-number');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });
});

describe('isValid', () => {
  it('returns true for a valid E.164 number', () => {
    expect(isValid('+12125550123')).toBe(true);
  });

  it('returns true for a valid national number with country hint', () => {
    expect(isValid('2125550123', 'US')).toBe(true);
  });

  it('returns false for an invalid number', () => {
    expect(isValid('not-a-number')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValid('')).toBe(false);
  });
});
