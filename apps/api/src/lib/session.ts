// Session cookie: a signed JWT in an HttpOnly cookie. JavaScript on the page can never read it.
import type { NextFunction, Request, Response } from 'express';
import { signToken, verifyToken } from '../auth/jwt';
import { unauthorized } from './errors';

export const SESSION_COOKIE = 'pp_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function startSession(res: Response, userId: string): Promise<void> {
  const token = await signToken({ userId }, { expiresIn: `${SESSION_TTL_SECONDS}s` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function endSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
}

// Reads the signed session cookie and sets req.userId. Every private route goes through this.
export async function requireUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw unauthorized();
    const claims = await verifyToken(token);
    (req as Request & { userId: string }).userId = claims.userId;
    next();
  } catch (err) {
    next(err instanceof Error && 'status' in err ? err : unauthorized());
  }
}

export function userIdOf(req: Request): string {
  const id = (req as Request & { userId?: string }).userId;
  if (!id) throw unauthorized();
  return id;
}
