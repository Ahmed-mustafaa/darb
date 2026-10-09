import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParentSession } from '@/lib/session';
import { getLocale } from '@/lib/i18n';
import { loadTrip } from '@/lib/trips';
import { notifText } from '@/lib/notify-text';

export const dynamic = 'force-dynamic';

/** Live status for the signed-in parent: where their children's bus is and how far away. */
export async function GET() {
  const session = getParentSession();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401 });
  const db = createAdminClient();
  const locale = getLocale();

  const [{ data: parent }, { data: kids }, { data: notes }] = await Promise.all([
    db.from('parents').select('home_lat, home_lng').eq('id', session.pid).maybeSingle(),
    db.from('children').select('id, full_name, bus_id').eq('parent_id', session.pid),
    db.from('notifications').select('id, kind, params, created_at').eq('parent_id', session.pid).order('created_at', { ascending: false }).limit(15),
  ]);
  const busIds = [...new Set((kids ?? []).map((k) => k.bus_id).filter(Boolean))] as string[];
  const { data: active } = busIds.length
    ? await db.from('trips').select('id').in('bus_id', busIds).is('ended_at', null)
    : { data: [] as { id: string }[] };

  const trips = [];
  for (const a of active ?? []) {
    const t = await loadTrip(db, a.id);
    if (!t) continue;
    const mine = t.stops.find((s) => s.parent_id === session.pid);
    if (!mine) continue;
    const pending = t.stops.filter((s) => !s.done);
    trips.push({
      id: t.trip.id,
      kind: t.trip.kind,
      bus: t.bus?.number,
      location: t.location ? { lat: t.location.lat, lng: t.location.lng, updated_at: t.location.updated_at } : null,
      eta: mine.done ? null : t.etas.get(mine.seq) ?? null,
      stopsBefore: mine.done ? 0 : pending.filter((s) => s.seq < mine.seq).length,
      isNext: !mine.done && pending[0]?.seq === mine.seq,
      done: mine.done,
      children: mine.children.map((c) => ({ name: (kids ?? []).find((k) => k.id === c.child_id)?.full_name ?? '', status: c.status })),
    });
  }

  const names = (ids: string[] | undefined) =>
    (ids ?? []).map((id) => (kids ?? []).find((k) => k.id === id)?.full_name?.split(' ')[0]).filter(Boolean) as string[];
  return NextResponse.json({
    home: parent?.home_lat != null ? { lat: parent.home_lat, lng: parent.home_lng } : null,
    trips,
    messages: (notes ?? []).map((n) => ({ id: n.id, at: n.created_at, kind: n.kind, text: notifText(n.kind, n.params ?? {}, names(n.params?.child_ids), locale) })),
  });
}
