import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server.js';
import { signAccessToken } from '../../src/auth/jwt.js';

const app = createApp();

function userToken(userId = 'test-user-id', role = 'user'): string {
  return signAccessToken(userId, role);
}

describe('GET /api/v1/me', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with a malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with Basic auth instead of Bearer', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200, 404, or 503 with a valid JWT (DB may be unavailable)', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${userToken()}`);
    expect([200, 404, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.user).toBeDefined();
      expect(typeof res.body.user.id).toBe('string');
      expect(typeof res.body.user.email).toBe('string');
    }
  });
});

describe('GET /api/v1/me/keys', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/me/keys');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/me/keys')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 or 503 with a valid JWT (DB may be unavailable)', async () => {
    const res = await request(app)
      .get('/api/v1/me/keys')
      .set('Authorization', `Bearer ${userToken()}`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.keys)).toBe(true);
    }
  });
});

describe('POST /api/v1/me/keys', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app)
      .post('/api/v1/me/keys')
      .send({ name: 'My Key' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when name field is missing', async () => {
    const res = await request(app)
      .post('/api/v1/me/keys')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when name is an empty string', async () => {
    const res = await request(app)
      .post('/api/v1/me/keys')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 or 503 with a valid name (DB may be unavailable)', async () => {
    const res = await request(app)
      .post('/api/v1/me/keys')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: 'Test Key' });
    expect([201, 503]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.key.name).toBe('Test Key');
      expect(res.body.key.plaintext).toMatch(/^pi_live_/);
      expect(res.body.key.key_prefix).toHaveLength(16);
    }
  });
});

describe('DELETE /api/v1/me/keys/:key_id', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).delete('/api/v1/me/keys/some-key-id');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .delete('/api/v1/me/keys/some-key-id')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });

  it('returns 404 or 503 for a non-existent key with valid token', async () => {
    const res = await request(app)
      .delete('/api/v1/me/keys/non-existent-key-id')
      .set('Authorization', `Bearer ${userToken()}`);
    expect([404, 503]).toContain(res.status);
  });
});

describe('GET /api/v1/me/usage', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/me/usage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for an invalid from date format', async () => {
    const res = await request(app)
      .get('/api/v1/me/usage?from=not-a-date')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid to date format (wrong separator)', async () => {
    const res = await request(app)
      .get('/api/v1/me/usage?to=2024/01/01')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 or 503 with valid ISO date params (DB may be unavailable)', async () => {
    const res = await request(app)
      .get('/api/v1/me/usage?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${userToken()}`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.usage)).toBe(true);
    }
  });

  it('returns 200 or 503 with no date params (full history)', async () => {
    const res = await request(app)
      .get('/api/v1/me/usage')
      .set('Authorization', `Bearer ${userToken()}`);
    expect([200, 503]).toContain(res.status);
  });
});
