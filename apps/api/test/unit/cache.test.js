import { describe, it, expect, vi } from 'vitest';
import { getCachedLookup, setCachedLookup } from '../../src/lookup/cache.js';
function makeMockRedis(overrides = {}) {
    return {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        ...overrides,
    };
}
const sampleResponse = {
    input: '+12125550123',
    valid: true,
    e164: '+12125550123',
    national_format: '(212) 555-0123',
    international_format: '+1 212-555-0123',
    country: { code: 'US', name: 'United States', calling_code: '1' },
    line_type: 'fixed_line',
    region: 'New York, NY',
    carrier: null,
    portability: {
        checked: false,
        note: 'Real-time portability requires a paid upstream.',
    },
    cached: false,
    lookup_id: '01HXX000000000000000000000',
};
describe('getCachedLookup', () => {
    it('returns null when the key does not exist in Redis', async () => {
        const redis = makeMockRedis({ get: vi.fn().mockResolvedValue(null) });
        const result = await getCachedLookup(redis, '+12125550123');
        expect(result).toBeNull();
    });
    it('calls Redis get with the correct prefixed key', async () => {
        const mockGet = vi.fn().mockResolvedValue(null);
        const redis = makeMockRedis({ get: mockGet });
        await getCachedLookup(redis, '+12125550123');
        expect(mockGet).toHaveBeenCalledWith('lookup:v1:+12125550123');
    });
    it('returns the parsed LookupResponse when the key exists', async () => {
        const redis = makeMockRedis({
            get: vi.fn().mockResolvedValue(JSON.stringify(sampleResponse)),
        });
        const result = await getCachedLookup(redis, '+12125550123');
        expect(result).toEqual(sampleResponse);
    });
    it('returns null when the stored value is invalid JSON', async () => {
        const redis = makeMockRedis({
            get: vi.fn().mockResolvedValue('not-valid-json{{{'),
        });
        const result = await getCachedLookup(redis, '+12125550123');
        expect(result).toBeNull();
    });
    it('uses the e164 number verbatim in the cache key', async () => {
        const mockGet = vi.fn().mockResolvedValue(null);
        const redis = makeMockRedis({ get: mockGet });
        await getCachedLookup(redis, '+447700900000');
        expect(mockGet).toHaveBeenCalledWith('lookup:v1:+447700900000');
    });
});
describe('setCachedLookup', () => {
    it('calls Redis set with the correct key, serialised value, and 24h TTL', async () => {
        const mockSet = vi.fn().mockResolvedValue('OK');
        const redis = makeMockRedis({ set: mockSet });
        await setCachedLookup(redis, '+12125550123', sampleResponse);
        expect(mockSet).toHaveBeenCalledWith('lookup:v1:+12125550123', JSON.stringify(sampleResponse), 'EX', 86400);
    });
    it('stores a round-trippable JSON value', async () => {
        let stored = null;
        const mockSet = vi.fn().mockImplementation((_k, v) => {
            stored = v;
            return Promise.resolve('OK');
        });
        const mockGet = vi.fn().mockImplementation(() => Promise.resolve(stored));
        const redis = makeMockRedis({ get: mockGet, set: mockSet });
        await setCachedLookup(redis, '+12125550123', sampleResponse);
        const retrieved = await getCachedLookup(redis, '+12125550123');
        expect(retrieved).toEqual(sampleResponse);
    });
});
//# sourceMappingURL=cache.test.js.map