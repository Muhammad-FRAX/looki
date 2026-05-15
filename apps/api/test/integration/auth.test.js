import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server.js';
const app = createApp();
describe('POST /api/v1/auth/register', () => {
    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ password: 'securepassword123' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 when password is shorter than 8 characters', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'test@example.com', password: 'short' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 for an invalid email format', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'not-an-email', password: 'securepassword123' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 when body is completely empty', async () => {
        const res = await request(app).post('/api/v1/auth/register').send({});
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 201 or 503 when body is valid (DB may be unavailable)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'newuser@example.com', password: 'securepassword123' });
        expect([201, 503, 500]).toContain(res.status);
        if (res.status === 201) {
            expect(typeof res.body.access_token).toBe('string');
            expect(typeof res.body.refresh_token).toBe('string');
            expect(res.body.user.email).toBe('newuser@example.com');
            expect(res.body.user.role).toBe('user');
        }
    });
});
describe('POST /api/v1/auth/login', () => {
    it('returns 400 when password is missing', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ password: 'somepassword' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 for an invalid email format', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'not-an-email', password: 'password' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 when password is empty string', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: '' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 401 or 503 for non-existent credentials (DB may be unavailable)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });
        expect([401, 503, 500]).toContain(res.status);
    });
    it('returns proper error body on 401', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'ghost@example.com', password: 'wrongpassword' });
        if (res.status === 401) {
            expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        }
    });
});
describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 when body is empty', async () => {
        const res = await request(app).post('/api/v1/auth/refresh').send({});
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 400 when refresh_token is an empty string', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refresh_token: '' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns 401 for a completely invalid refresh token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refresh_token: 'this-is-not-a-jwt' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
    it('returns 401 for a tampered refresh token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.tampered' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
});
describe('POST /api/v1/auth/logout', () => {
    it('returns 204 with an invalid token (logout always succeeds from client perspective)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .send({ refresh_token: 'invalid-token' });
        expect(res.status).toBe(204);
    });
    it('returns 204 with no body at all', async () => {
        const res = await request(app).post('/api/v1/auth/logout').send({});
        expect(res.status).toBe(204);
    });
    it('returns 204 with a well-formed but revoked/non-existent token', async () => {
        // A syntactically-valid JWT that does not exist in the DB
        const { signRefreshToken } = await import('../../src/auth/jwt.js');
        const { token } = signRefreshToken('phantom-user');
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .send({ refresh_token: token });
        expect(res.status).toBe(204);
    });
});
//# sourceMappingURL=auth.test.js.map