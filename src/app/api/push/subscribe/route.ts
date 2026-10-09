import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParentSession } from '@/lib/session';
import { getLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Saves this phone's notification subscription for the signed-in parent. */
export async function POST(req: NextRequest) {
  const session = getParentSession();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401 });
  const sub = await req.json().catch(() => null);
  const endpoint = String(sub?.endpoint ?? '');
  const p256dh = String(sub?.keys?.p256dh ?? '');
  const auth = String(sub?.keys?.auth ?? '');
  if (!endpoint.startsWith('https://') || !p256dh || !auth) return NextResponse.json({ error: 'bad_subscription' }, { status: 400 });
  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert({ parent_id: session.pid, endpoint, p256dh, auth, lang: getLocale() }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
