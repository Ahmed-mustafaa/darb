import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { SupabaseClient } from '@supabase/supabase-js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const MIN_PASSWORD = 6;

/** "scrypt$<salt>$<hash>", both base64. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function checkPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(pw, Buffer.from(saltB64, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Too many wrong passwords for this number in the last 15 minutes? */
export async function tooManyAttempts(db: SupabaseClient<any, any, any>, phone: string) {
  const since = new Date(Date.now() - 15 * 60e3).toISOString();
  const { count } = await db.from('signin_attempts').select('id', { count: 'exact', head: true }).eq('phone', phone).eq('ok', false).gte('created_at', since);
  return (count ?? 0) >= 8;
}

export async function recordAttempt(db: SupabaseClient<any, any, any>, phone: string, ok: boolean) {
  await db.from('signin_attempts').insert({ phone, ok });
}
