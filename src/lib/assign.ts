import type { SupabaseClient } from '@supabase/supabase-js';
import { suggestBuses, type LatLng } from '@/lib/geo';

/**
 * Puts a family's children without a bus on the best bus (same school, free seat,
 * closest pickups). Returns how many children were assigned.
 */
export async function autoAssignFamily(db: SupabaseClient<any, any, any>, parentId: string): Promise<number> {
  const [{ data: kids }, { data: buses }, { data: allKids }, { data: parents }, { data: schools }] = await Promise.all([
    db.from('children').select('id, school_id, parent_id').eq('parent_id', parentId).is('bus_id', null),
    db.from('buses').select('id, number, capacity, school_id'),
    db.from('children').select('bus_id, parent_id').not('bus_id', 'is', null),
    db.from('parents').select('id, home_lat, home_lng'),
    db.from('schools').select('id, lat, lng'),
  ]);
  if (!kids?.length || !buses?.length) return 0;

  const home = (pid: string): LatLng | null => {
    const p = parents?.find((x) => x.id === pid);
    return p && p.home_lat != null && p.home_lng != null ? { lat: p.home_lat, lng: p.home_lng } : null;
  };
  const suggestions = suggestBuses(
    kids.map((k) => ({ id: k.id, school_id: k.school_id, home: home(k.parent_id) })),
    buses.map((b) => {
      const onBus = (allKids ?? []).filter((k) => k.bus_id === b.id);
      return {
        id: b.id,
        number: b.number,
        capacity: b.capacity,
        school_id: b.school_id,
        used: onBus.length,
        homes: onBus.map((k) => home(k.parent_id)).filter((x): x is LatLng => !!x),
      };
    }),
    Object.fromEntries((schools ?? []).map((s) => [s.id, s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null])),
  );

  let assigned = 0;
  for (const s of suggestions) {
    if (!s.busId) continue;
    const { error } = await db.from('children').update({ bus_id: s.busId }).eq('id', s.childId);
    if (!error) assigned++;
  }
  return assigned;
}
