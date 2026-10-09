import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushDemo, pushReady } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** Admin demo: sends a family the "bus is 10 minutes away" alert right now (the admin page does the countdown). */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'signin' }, { status: 401 });
  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!pushReady()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const { parent_id } = await req.json().catch(() => ({}));
  if (!parent_id) return NextResponse.json({ error: 'generic' }, { status: 400 });
  const r = await pushDemo(createAdminClient(), String(parent_id));
  if (r.phones === 0) return NextResponse.json({ error: 'no_subscription' }, { status: 404 });
  if (r.sent === 0) return NextResponse.json({ error: 'send_failed', detail: r.failed.join(' | ') }, { status: 502 });
  return NextResponse.json({ ok: true, sent: r.sent });
}
