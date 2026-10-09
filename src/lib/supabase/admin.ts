import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/**
 * Server-only client with full database access, used for parent pages.
 * Parents don't have Supabase accounts; every query here is scoped to the
 * parent id from their signed session cookie. Never import this in a client component.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from .env.local (Supabase → Project Settings → API Keys → service_role).');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
