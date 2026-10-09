import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadTrip } from '@/lib/trips';

export const dynamic = 'force-dynamic';

/** Every bus with its last position and trip progress, for the admin live map. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'signin' }, { status: 401 });
  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [{ data: buses }, { data: locs }, { data: trips }, { data: staff }] = await Promise.all([
    supabase.from('buses').select('id, number, driver_id, supervisor_id').order('number'),
    supabase.from('bus_locations').select('*'),
    supabase.from('trips').select('id, bus_id, kind, started_at').is('ended_at', null),
    supabase.from('staff').select('id, full_name, phone'),
  ]);

  const out = [];
  for (const b of buses ?? []) {
    const trip = (trips ?? []).find((t) => t.bus_id === b.id) ?? null;
    const loc = (locs ?? []).find((l) => l.bus_id === b.id) ?? null;
    let progress = null;
    if (trip) {
      const t = await loadTrip(supabase, trip.id);
      if (t) {
        const next = t.stops.find((s) => !s.done);
        progress = {
          done: t.stops.filter((s) => s.done).length,
          total: t.stops.length,
          next: next ? (t.parents.find((p: any) => p.id === next.parent_id)?.full_name ?? '') : null,
          nextEta: next ? t.etas.get(next.seq) ?? null : null,
          stops: t.stops.filter((s) => s.home).map((s) => ({ lat: s.home!.lat, lng: s.home!.lng, done: s.done })),
        };
      }
    }
    const person = (id: string | null) => (staff ?? []).find((s) => s.id === id) ?? null;
    out.push({
      id: b.id,
      number: b.number,
      driver: person(b.driver_id),
      supervisor: person(b.supervisor_id),
      trip: trip ? { id: trip.id, kind: trip.kind, started_at: trip.started_at } : null,
      location: loc ? { lat: loc.lat, lng: loc.lng, speed: loc.speed_kmh, accuracy: loc.accuracy_m, updated_at: loc.updated_at } : null,
      progress,
    });
  }
  return NextResponse.json({ buses: out });
}
