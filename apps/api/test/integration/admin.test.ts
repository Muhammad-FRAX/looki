import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server.js';
import { signAccessToken } from '../../src/auth/jwt.js';

const app = createApp();

function userToken(): string {
  return signAccessToken('regular-user-id', 'user');
}

function adminToken(): string {
  return signAccessToken('admin-user-id', 'admin');
}

describe('GET /api/v1/admin/stats', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid JWT', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user has role=user', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 200 or 503 for an admin JWT (DB may be unavailable)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.total_users).toBe('number');
      expect(typeof res.body.stats.total_lookups).toBe('number');
      expect(typeof res.body.stats.cache_hit_ratio).toBe('number');
      expect(res.body.stats.latency_24h).toBeDefined();
    }
  });
});

describe('GET /api/v1/admin/users', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user has role=user', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 200 or 503 for an admin JWT (DB may be unavailable)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(typeof res.body.pagination.total).toBe('number');
      expect(typeof res.body.pagination.pages).toBe('number');
    }
  });

  it('returns 400 when page=0 (below minimum)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=0')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when limit exceeds 100', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?limit=101')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts custom valid pagination params', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=2&limit=10')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
    }
  });
});

describe('POST /api/v1/admin/data/reload', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).post('/api/v1/admin/data/reload');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user has role=user', async () => {
    const res = await request(app)
      .post('/api/v1/admin/data/reload')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 202 or 503 for an admin JWT (DB/Redis may be unavailable)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/data/reload')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect([202, 503]).toContain(res.status);
    if (res.status === 202) {
      expect(res.body.status).toBe('accepted');
    }
  });
});
