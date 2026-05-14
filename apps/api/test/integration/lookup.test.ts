import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server.js';

const app = createApp();

describe('GET /api/v1/lookup', () => {
  it('returns 400 when number param is missing', async () => {
    const res = await request(app).get('/api/v1/lookup');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when number is empty', async () => {
    const res = await request(app).get('/api/v1/lookup?number=');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a valid response shape for a valid E.164 number (no DB)', async () => {
    // Without DATABASE_URL the route returns 503; with it, 200 or 200 with carrier: null
    const res = await request(app).get('/api/v1/lookup?number=%2B12125550123');
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.input).toBe('+12125550123');
      expect(res.body.valid).toBe(true);
      expect(res.body.e164).toBe('+12125550123');
      expect(typeof res.body.cached).toBe('boolean');
      expect(typeof res.body.lookup_id).toBe('string');
    }
  });

  it('returns valid:false for an invalid number without hitting the DB', async () => {
    const res = await request(app).get('/api/v1/lookup?number=not-a-phone');
    // Parser rejects before any DB call, so always 200 regardless of DB state
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.carrier).toBeNull();
    expect(res.body.country).toBeNull();
    expect(typeof res.body.lookup_id).toBe('string');
  });

  it('returns 400 when country param is not exactly 2 chars', async () => {
    const res = await request(app).get('/api/v1/lookup?number=%2B12125550123&country=USA');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
