import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession } from '@/lib/session';
import { runAlerts } from '@/lib/trips';

export const dynamic = 'force-dynamic';

/** The driver's or supervisor's phone posts its GPS position here every few seconds during a trip. */
export async function POST(req: NextRequest) {
  const session = getStaffSession();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!(lat > 21 && lat < 32.5 && lng > 24 && lng < 37.5)) return NextResponse.json({ error: 'bad_position' }, { status: 400 });

  const db = createAdminClient();
  const { data: bus } = await db.from('buses').select('id').or(`driver_id.eq.${session.sid},supervisor_id.eq.${session.sid}`).maybeSingle();
  if (!bus) return NextResponse.json({ error: 'no_bus' }, { status: 403 });
  const { data: trip } = await db.from('trips').select('id').eq('bus_id', bus.id).is('ended_at', null).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'no_trip' }, { status: 409 });

  await db.from('bus_locations').upsert({
    bus_id: bus.id,
    lat,
    lng,
    speed_kmh: Number.isFinite(Number(body?.speed)) ? Number(body.speed) * 3.6 : null, // browser gives m/s
    heading: Number.isFinite(Number(body?.heading)) ? Number(body.heading) : null,
    accuracy_m: Number.isFinite(Number(body?.accuracy)) ? Number(body.accuracy) : null,
    updated_at: new Date().toISOString(),
  });
  await runAlerts(db, trip.id);
  return NextResponse.json({ ok: true });
}
