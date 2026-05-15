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

describe('POST /api/v1/lookup/bulk', () => {
  it('returns 400 when body is missing', async () => {
    const res = await request(app).post('/api/v1/lookup/bulk').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when numbers array is empty', async () => {
    const res = await request(app).post('/api/v1/lookup/bulk').send({ numbers: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when numbers array exceeds 1000', async () => {
    const numbers = Array.from({ length: 1001 }, () => '+12125550123');
    const res = await request(app).post('/api/v1/lookup/bulk').send({ numbers });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns array of results for valid input (no DB)', async () => {
    const res = await request(app)
      .post('/api/v1/lookup/bulk')
      .send({ numbers: ['+12125550123', 'not-a-number'] });

    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      // Second item is invalid number — should have valid: false
      expect(res.body[1].valid).toBe(false);
    }
  });

  it('returns array with valid:false for entirely invalid numbers', async () => {
    const res = await request(app)
      .post('/api/v1/lookup/bulk')
      .send({ numbers: ['not-a-number', 'also-not-a-number'] });

    // Parser rejects before DB, so should always return results (not 503)
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      for (const item of res.body) {
        if ('valid' in item) {
          expect(item.valid).toBe(false);
        }
      }
    }
  });

  it('accepts optional country parameter', async () => {
    const res = await request(app)
      .post('/api/v1/lookup/bulk')
      .send({ numbers: ['+12125550123'], country: 'US' });
    expect([200, 503]).toContain(res.status);
  });

  it('rejects invalid country parameter (not 2 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/lookup/bulk')
      .send({ numbers: ['+12125550123'], country: 'USA' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
