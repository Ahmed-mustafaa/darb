import { cookies } from 'next/headers';
import type { FlashKey } from '@/lib/i18n-flash';

/**
 * Queues a short pop-up message for the next page the user sees.
 * Read and cleared by <FlashToast/> in the browser.
 */
export function flash(key: FlashKey, params: Record<string, string | number> = {}) {
  // base64url keeps the cookie value safe whatever the text (Arabic names, quotes, commas)
  const value = Buffer.from(JSON.stringify({ k: key, p: params, t: Date.now() })).toString('base64url');
  cookies().set('darb_flash', value, {
    path: '/',
    maxAge: 60,
    sameSite: 'lax',
    httpOnly: false, // the toast reads it in the browser
  });
}
