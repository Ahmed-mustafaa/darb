import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParentSession } from '@/lib/session';
import { hasPhone, pushDemo, pushReady } from '@/lib/push';

export const dynamic = 'force-dynamic';
// The server waits before sending, so the parent has time to close the app.
export const maxDuration = 60;
const WAIT_SECONDS = 50;

/** Demo: sends the parent a "bus is 10 minutes away" alert about a minute after they tap the button. */
export async function POST() {
  const session = getParentSession();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401 });
  if (!pushReady()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const db = createAdminClient();
  if (!(await hasPhone(db, session.pid))) return NextResponse.json({ error: 'no_subscription' }, { status: 404 });
  await new Promise((r) => setTimeout(r, WAIT_SECONDS * 1000));
  const r = await pushDemo(db, session.pid);
  if (r.sent === 0) return NextResponse.json({ error: 'send_failed', detail: r.failed.join(' | ') }, { status: 502 });
  return NextResponse.json({ ok: true, sent: r.sent });
}
