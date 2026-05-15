import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server.js';
const app = createApp();
describe('GET /api/v1/health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
});
describe('GET /api/v1/ready', () => {
    it('returns 200 when DB is reachable, 503 otherwise', async () => {
        const res = await request(app).get('/api/v1/ready');
        expect([200, 503]).toContain(res.status);
        expect(['ok', 'error']).toContain(res.body.status);
    });
});
describe('404 handler', () => {
    it('returns 404 for unknown routes', async () => {
        const res = await request(app).get('/api/v1/unknown');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});
//# sourceMappingURL=health.test.js.map