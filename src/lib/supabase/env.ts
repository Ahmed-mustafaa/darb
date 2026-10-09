/**
 * Reads the Supabase settings and tidies common copy-paste mistakes:
 * quotes, spaces, a doubled "https:", a trailing "/" or a pasted "/rest/v1" path.
 */
export function supabaseEnv() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/^["']|["']$/g, '');
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().replace(/^["']|["']$/g, '');

  let url = rawUrl.replace(/^(https?:)+\/*/i, 'https://');
  try {
    url = new URL(url).origin; // keeps only https://<project>.supabase.co
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL in .env.local is not a valid address. It should look like https://<your-project>.supabase.co',
    );
  }
  if (!rawKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local');
  return { url, key: rawKey };
}
