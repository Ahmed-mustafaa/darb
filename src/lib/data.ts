import { createClient } from '@/lib/supabase/server';

export type School = { id: string; name_ar: string; name_en: string; lat: number | null; lng: number | null };
export type Staff = { id: string; full_name: string; phone: string; role: 'driver' | 'supervisor'; license_expiry: string | null; active: boolean };
export type Bus = {
  id: string;
  number: number;
  plate_letters: string | null;
  plate_number: string | null;
  model: string | null;
  capacity: number;
  school_id: string | null;
  driver_id: string | null;
  supervisor_id: string | null;
  status: 'parked' | 'on_route' | 'at_school';
};
export type Parent = { id: string; full_name: string; phone: string; home_lat: number | null; home_lng: number | null; address: string | null };
export type Child = { id: string; full_name: string; grade: string | null; notes: string | null; school_id: string | null; bus_id: string | null; parent_id: string; created_at: string };

/** Everything the admin pages need, in one round trip per table. */
export async function loadAll() {
  const supabase = createClient();
  const [schools, staff, buses, children, parents, payments] = await Promise.all([
    supabase.from('schools').select('*').order('name_en'),
    supabase.from('staff').select('*').order('full_name'),
    supabase.from('buses').select('*').order('number'),
    supabase.from('children').select('*').order('created_at', { ascending: false }),
    supabase.from('parents').select('id, full_name, phone, home_lat, home_lng, address'),
    supabase.from('payments').select('parent_id, status'),
  ]);
  const paidParents = new Set((payments.data ?? []).filter((p) => p.status === 'paid').map((p) => p.parent_id as string));
  const error = schools.error || staff.error || buses.error || children.error || parents.error;
  if (error) throw new Error(error.message);
  return {
    schools: (schools.data ?? []) as School[],
    staff: (staff.data ?? []) as Staff[],
    buses: (buses.data ?? []) as Bus[],
    children: (children.data ?? []) as Child[],
    parents: (parents.data ?? []) as Parent[],
    paidParents,
  };
}

export function seatsUsed(children: Child[]) {
  const m = new Map<string, number>();
  for (const c of children) if (c.bus_id) m.set(c.bus_id, (m.get(c.bus_id) ?? 0) + 1);
  return m;
}
