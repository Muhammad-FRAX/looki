import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { findCarrier, findCountry } from '../../src/lookup/carrierRepo.js';
const DATABASE_URL = process.env['DATABASE_URL'];
describe.skipIf(!DATABASE_URL)('carrierRepo (requires DATABASE_URL)', () => {
    let pool;
    beforeAll(async () => {
        pool = new pg.Pool({ connectionString: DATABASE_URL });
        await pool.query('SELECT 1');
    });
    afterAll(async () => {
        await pool.end();
    });
    describe('findCountry', () => {
        it('returns US country info', async () => {
            const country = await findCountry(pool, 'US');
            expect(country).not.toBeNull();
            expect(country.code.trim()).toBe('US');
            expect(country.name).toBe('United States');
            expect(country.calling_code).toBe('1');
        });
        it('returns GB country info', async () => {
            const country = await findCountry(pool, 'GB');
            expect(country).not.toBeNull();
            expect(country.code.trim()).toBe('GB');
            expect(country.calling_code).toBe('44');
        });
        it('returns AU country info', async () => {
            const country = await findCountry(pool, 'AU');
            expect(country).not.toBeNull();
            expect(country.calling_code).toBe('61');
        });
        it('returns null for an unknown country code', async () => {
            const country = await findCountry(pool, 'XX');
            expect(country).toBeNull();
        });
        it('is case-insensitive', async () => {
            const country = await findCountry(pool, 'us');
            expect(country).not.toBeNull();
            expect(country.code.trim()).toBe('US');
        });
    });
    describe('findCarrier', () => {
        it('returns null when no prefix data exists for a country', async () => {
            const result = await findCarrier(pool, 'US', '2125550123');
            expect(result).toBeNull();
        });
    });
});
//# sourceMappingURL=carrierRepo.test.js.map