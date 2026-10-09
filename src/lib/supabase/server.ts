import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export function createClient() {
  const cookieStore = cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are refreshed by the middleware instead.
          }
        },
      },
    },
  );
}
