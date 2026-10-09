import type { FlashKey } from '@/lib/i18n-flash';

/**
 * Adds a confirmation message to a redirect URL: /parent → /parent?done=receiptSent.
 * <ResultAlert/> shows it as an alert over a dimmed screen, then removes it from the address bar.
 */
export function done(url: string, key: FlashKey, params: Record<string, string | number> = {}) {
  const [path, hash] = url.split('#');
  const u = new URL(path, 'http://local');
  u.searchParams.delete('ok');
  u.searchParams.set('done', key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set('d_' + k, String(v));
  return u.pathname + u.search + (hash ? '#' + hash : '');
}
