import { ulid } from 'ulidx';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = ulid();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
