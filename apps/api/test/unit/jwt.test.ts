import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  requireJwt,
  requireAdmin,
} from '../../src/auth/jwt.js';

describe('signAccessToken / verifyAccessToken', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken('user-id-123', 'user');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-id-123');
    expect(payload.role).toBe('user');
    expect(typeof payload.jti).toBe('string');
    expect(payload.jti.length).toBeGreaterThan(0);
  });

  it('encodes the admin role correctly', () => {
    const token = signAccessToken('admin-id', 'admin');
    const payload = verifyAccessToken(token);
    expect(payload.role).toBe('admin');
  });

  it('generates unique jti values on each call', () => {
    const t1 = signAccessToken('user-1', 'user');
    const t2 = signAccessToken('user-1', 'user');
    const p1 = verifyAccessToken(t1);
    const p2 = verifyAccessToken(t2);
    expect(p1.jti).not.toBe(p2.jti);
  });

  it('throws for an invalid token string', () => {
    expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow();
  });

  it('throws for a tampered token', () => {
    const token = signAccessToken('user-id-123', 'user');
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => verifyAccessToken('')).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('returns token, jti, and expiresAt', () => {
    const { token, jti, expiresAt } = signRefreshToken('user-id-456');
    expect(typeof token).toBe('string');
    expect(typeof jti).toBe('string');
    expect(expiresAt).toBeInstanceOf(Date);
  });

  it('verifies the refresh token and returns matching payload', () => {
    const { token, jti } = signRefreshToken('user-id-456');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-id-456');
    expect(payload.jti).toBe(jti);
  });

  it('sets expiresAt approximately 7 days from now', () => {
    const before = Date.now();
    const { expiresAt } = signRefreshToken('user-id');
    const after = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(before + sevenDaysMs - 5000);
    expect(expiresAt.getTime()).toBeLessThan(after + sevenDaysMs + 5000);
  });

  it('throws for an invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => verifyRefreshToken('')).toThrow();
  });
});

describe('requireJwt middleware', () => {
  function makeRes() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  }

  it('returns 401 when no Authorization header', () => {
    const req = { headers: {} } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization is not Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid JWT', () => {
    const req = { headers: { authorization: 'Bearer not.a.valid.token' } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user for a valid JWT', () => {
    const token = signAccessToken('user-abc', 'user');
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireJwt(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({ id: 'user-abc', role: 'user' });
  });

  it('propagates the admin role to req.user', () => {
    const token = signAccessToken('admin-xyz', 'admin');
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireJwt(req, res, next);

    expect((req as any).user).toEqual({ id: 'admin-xyz', role: 'admin' });
  });
});

describe('requireAdmin middleware', () => {
  function makeRes() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  it('returns 403 when req.user is not set', () => {
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is user', () => {
    const req = { user: { id: 'user-1', role: 'user' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user role is admin', () => {
    const req = { user: { id: 'admin-1', role: 'admin' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
