import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession } from '@/lib/session';

/** The signed-in driver or supervisor, their bus and its running trip (if any). */
export async function requireCrew() {
  const session = getStaffSession();
  if (!session) redirect('/crew/signin');
  const db = createAdminClient();
  const { data: staff } = await db.from('staff').select('id, full_name, phone, role, active').eq('id', session.sid).maybeSingle();
  if (!staff || !staff.active) redirect('/crew/signin?error=nostaff');
  const { data: bus } = await db
    .from('buses')
    .select('id, number, plate_letters, plate_number, school_id, driver_id, supervisor_id')
    .or(`driver_id.eq.${staff.id},supervisor_id.eq.${staff.id}`)
    .maybeSingle();
  const { data: trip } = bus
    ? await db.from('trips').select('id, kind, started_at').eq('bus_id', bus.id).is('ended_at', null).maybeSingle()
    : { data: null };
  return { db, staff, bus, trip } as {
    db: ReturnType<typeof createAdminClient>;
    staff: { id: string; full_name: string; phone: string; role: 'driver' | 'supervisor' };
    bus: { id: string; number: number; plate_letters: string | null; plate_number: string | null; school_id: string | null } | null;
    trip: { id: string; kind: 'morning' | 'afternoon'; started_at: string } | null;
  };
}
