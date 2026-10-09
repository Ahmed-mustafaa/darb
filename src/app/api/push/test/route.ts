import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParentSession } from '@/lib/session';
import { pushReady, pushToParent } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** Sends "notifications work" to the signed-in parent's phones. */
export async function POST() {
  const session = getParentSession();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401 });
  if (!pushReady()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  await pushToParent(createAdminClient(), session.pid, 'test', {});
  return NextResponse.json({ ok: true });
}
