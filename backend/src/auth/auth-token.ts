import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export type AuthTokenPayload = {
  sub: string;
  tipo: 'admin' | 'cliente' | 'plataforma';
  lojaId?: string;
  username?: string;
  telefone?: string;
};

let devJwtSecret: string | null = null;

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') return '';
  if (!devJwtSecret) {
    devJwtSecret = randomBytes(32).toString('hex');
  }
  return devJwtSecret;
}

export function signAuthToken(payload: AuthTokenPayload, expiresIn: string): string {
  return (jwt as any).sign(payload, getJwtSecret(), { expiresIn });
}

export function readAuthTokenFromRequest(req: { headers?: Record<string, unknown> }): string | null {
  const cookieHeader = (req.headers?.cookie as string | undefined) || null;
  const cookies = parseCookieHeader(cookieHeader);
  return cookies.extraplus_token || null;
}

export function readRawCookie(req: { headers?: Record<string, unknown> }, name: string): string | null {
  const cookieHeader = (req.headers?.cookie as string | undefined) || null;
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[name] || null;
}

export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  } as const;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthPayloadFromRequest(req: { headers?: Record<string, unknown> }): AuthTokenPayload | null {
  const token = readAuthTokenFromRequest(req);
  if (!token) return null;
  return verifyAuthToken(token);
}
