import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const PARENT_COOKIE = 'darb_parent';

function secret() {
  const s = (process.env.SESSION_SECRET ?? '').trim();
  if (s.length < 32) throw new Error('SESSION_SECRET in .env.local must be at least 32 characters (see README).');
  return s;
}

function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp: number };
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSec,
});

// ───── Signed-in parent ─────
export type ParentSession = { pid: string; phone: string };

export function getParentSession(): ParentSession | null {
  return verify<ParentSession>(cookies().get(PARENT_COOKIE)?.value);
}
export function setParentSession(s: ParentSession) {
  const days = 60;
  cookies().set(PARENT_COOKIE, sign({ ...s, exp: Date.now() + days * 864e5 }), cookieOpts(days * 86400));
}
export function clearParentSession() {
  cookies().delete(PARENT_COOKIE);
}

// ───── Signed-in driver or supervisor ─────
const STAFF_COOKIE = 'darb_crew';
export type StaffSession = { sid: string; phone: string };

export function getStaffSession(): StaffSession | null {
  return verify<StaffSession>(cookies().get(STAFF_COOKIE)?.value);
}
export function setStaffSession(s: StaffSession) {
  const days = 30;
  cookies().set(STAFF_COOKIE, sign({ ...s, exp: Date.now() + days * 864e5 }), cookieOpts(days * 86400));
}
export function clearStaffSession() {
  cookies().delete(STAFF_COOKIE);
}
