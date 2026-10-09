import type { SupabaseClient } from '@supabase/supabase-js';
import { distanceKm, type LatLng } from '@/lib/geo';
import { pushToParent } from '@/lib/push';
import { todayCairo } from '@/lib/subscription';

type DB = SupabaseClient<any, any, any>;
export type TripKind = 'morning' | 'afternoon';

/** City driving with stops: road distance ≈ 1.35 × straight line, average 20 km/h. */
const ROAD_FACTOR = 1.35;
const AVG_KMH = 20;
export const minutesFor = (km: number) => (km * ROAD_FACTOR * 60) / AVG_KMH;

/**
 * Orders the families on a bus.
 * Morning: start at the family farthest from school, then always the nearest next one.
 * Afternoon: start from school, always the nearest next one.
 */
export function orderStops<T extends { home: LatLng | null }>(stops: T[], school: LatLng | null, kind: TripKind): T[] {
  const withHome = stops.filter((s) => s.home);
  const noHome = stops.filter((s) => !s.home);
  if (!withHome.length) return stops;
  const left = [...withHome];
  const out: T[] = [];
  let cur: LatLng;
  if (kind === 'morning' && school) {
    left.sort((a, b) => distanceKm(b.home!, school) - distanceKm(a.home!, school));
    const first = left.shift()!;
    out.push(first);
    cur = first.home!;
  } else {
    cur = school ?? left[0].home!;
  }
  while (left.length) {
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (distanceKm(cur, left[i].home!) < distanceKm(cur, left[bi].home!)) bi = i;
    const next = left.splice(bi, 1)[0];
    out.push(next);
    cur = next.home!;
  }
  return [...out, ...noHome];
}

export type TripChild = { child_id: string; parent_id: string; seq: number; status: 'waiting' | 'picked_up' | 'absent' | 'dropped_off' };
export type Stop = { seq: number; parent_id: string; home: LatLng | null; children: TripChild[]; done: boolean };

/** Groups the trip's children into family stops, in order. A stop is done when none of its children is still waiting. */
export function stopsOf(rows: TripChild[], homes: Map<string, LatLng | null>, kind: TripKind): Stop[] {
  const by = new Map<number, Stop>();
  for (const r of rows) {
    if (!by.has(r.seq)) by.set(r.seq, { seq: r.seq, parent_id: r.parent_id, home: homes.get(r.parent_id) ?? null, children: [], done: false });
    by.get(r.seq)!.children.push(r);
  }
  const list = [...by.values()].sort((a, b) => a.seq - b.seq);
  for (const s of list) {
    s.done =
      kind === 'morning'
        ? s.children.every((c) => c.status !== 'waiting')
        : s.children.every((c) => c.status === 'dropped_off' || c.status === 'absent');
  }
  return list;
}

/** Minutes until the bus reaches each pending stop, following the stop order. */
export function etas(stops: Stop[], bus: LatLng | null): Map<number, number> {
  const out = new Map<number, number>();
  if (!bus) return out;
  let cur = bus;
  let km = 0;
  for (const s of stops) {
    if (s.done || !s.home) continue;
    km += distanceKm(cur, s.home);
    cur = s.home;
    out.set(s.seq, Math.max(1, Math.round(minutesFor(km))));
  }
  return out;
}

// ───────────────────────── trip lifecycle ─────────────────────────

export async function loadTrip(db: DB, tripId: string) {
  const { data: trip } = await db.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (!trip) return null;
  const [{ data: rows }, { data: loc }, { data: bus }] = await Promise.all([
    db.from('trip_children').select('child_id, parent_id, seq, status').eq('trip_id', tripId),
    db.from('bus_locations').select('*').eq('bus_id', trip.bus_id).maybeSingle(),
    db.from('buses').select('id, number, school_id').eq('id', trip.bus_id).maybeSingle(),
  ]);
  const parentIds = [...new Set((rows ?? []).map((r: TripChild) => r.parent_id))];
  const { data: parents } = parentIds.length
    ? await db.from('parents').select('id, full_name, phone, second_phone, home_lat, home_lng, address, landmark').in('id', parentIds)
    : { data: [] as any[] };
  const homes = new Map<string, LatLng | null>(
    (parents ?? []).map((p: any) => [p.id, p.home_lat != null && p.home_lng != null ? { lat: p.home_lat, lng: p.home_lng } : null]),
  );
  const stops = stopsOf((rows ?? []) as TripChild[], homes, trip.kind);
  const busPos = loc ? { lat: loc.lat, lng: loc.lng } : null;
  return { trip, bus, stops, parents: parents ?? [], location: loc, etas: etas(stops, busPos) };
}

/** Starts a trip for a bus with every child whose family has paid, in route order. */
export async function startTrip(db: DB, busId: string, kind: TripKind, staffId: string) {
  const { data: active } = await db.from('trips').select('id').eq('bus_id', busId).is('ended_at', null).maybeSingle();
  if (active) return active.id as string;

  const [{ data: bus }, { data: kids }, { data: paid }] = await Promise.all([
    db.from('buses').select('id, number, school_id').eq('id', busId).single(),
    db.from('children').select('id, parent_id').eq('bus_id', busId),
    db.from('payments').select('parent_id, valid_until').eq('status', 'paid'),
  ]);
  const today = todayCairo();
  // Families whose subscription covers today (payments confirmed before dates existed have no end date)
  const paidSet = new Set((paid ?? []).filter((p: any) => !p.valid_until || p.valid_until >= today).map((p: any) => p.parent_id));
  const riders = (kids ?? []).filter((k: any) => paidSet.has(k.parent_id));
  const parentIds = [...new Set(riders.map((k: any) => k.parent_id))];
  const [{ data: parents }, { data: school }] = await Promise.all([
    parentIds.length ? db.from('parents').select('id, home_lat, home_lng').in('id', parentIds) : Promise.resolve({ data: [] as any[] }),
    bus?.school_id ? db.from('schools').select('lat, lng').eq('id', bus.school_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const families = parentIds.map((pid) => {
    const p = (parents ?? []).find((x: any) => x.id === pid);
    return { pid, home: p && p.home_lat != null ? { lat: p.home_lat, lng: p.home_lng } : null };
  });
  const schoolPos = school && school.lat != null ? { lat: school.lat, lng: school.lng } : null;
  const ordered = orderStops(families, schoolPos, kind);
  const seqOf = new Map(ordered.map((f, i) => [f.pid, i + 1]));

  const { data: trip, error } = await db.from('trips').insert({ bus_id: busId, kind, started_by: staffId }).select('id').single();
  if (error || !trip) throw new Error(error?.message ?? 'TRIP_FAILED');
  if (riders.length) {
    await db.from('trip_children').insert(
      riders.map((k: any) => ({
        trip_id: trip.id,
        child_id: k.id,
        parent_id: k.parent_id,
        seq: seqOf.get(k.parent_id) ?? 999,
        // Afternoon: children board at school, so they start on the bus.
        status: kind === 'afternoon' ? 'picked_up' : 'waiting',
      })),
    );
  }
  await db.from('buses').update({ status: 'on_route' }).eq('id', busId);
  await runAlerts(db, trip.id);
  return trip.id as string;
}

export async function endTrip(db: DB, tripId: string) {
  const { data: trip } = await db.from('trips').update({ ended_at: new Date().toISOString() }).eq('id', tripId).is('ended_at', null).select('bus_id, kind').maybeSingle();
  if (!trip) return;
  await db.from('buses').update({ status: trip.kind === 'morning' ? 'at_school' : 'parked' }).eq('id', trip.bus_id);
  if (trip.kind === 'morning') {
    const { data: rows } = await db.from('trip_children').select('parent_id, child_id, status').eq('trip_id', tripId).eq('status', 'picked_up');
    const byParent = new Map<string, string[]>();
    (rows ?? []).forEach((r: any) => byParent.set(r.parent_id, [...(byParent.get(r.parent_id) ?? []), r.child_id]));
    for (const [pid, kids] of byParent) await notify(db, { parentId: pid, tripId, kind: 'at_school', params: { child_ids: kids } });
  }
}

/** Marks one child and sends the alerts that follow from it. */
export async function markChild(db: DB, tripId: string, childId: string, status: TripChild['status']) {
  const { data: row } = await db
    .from('trip_children')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('child_id', childId)
    .select('parent_id')
    .maybeSingle();
  if (!row) return;
  const kind = status === 'picked_up' ? 'picked_up' : status === 'absent' ? 'absent' : status === 'dropped_off' ? 'dropped_off' : null;
  if (kind) await notify(db, { parentId: row.parent_id, tripId, kind, params: { child_ids: [childId] }, perChild: true });
  await runAlerts(db, tripId);
}

/**
 * Sends the "you're next" alert to the first family still waiting, and the
 * 10-minute alert to every family the bus can reach within 10 minutes.
 */
export async function runAlerts(db: DB, tripId: string) {
  const t = await loadTrip(db, tripId);
  if (!t || t.trip.ended_at) return;
  const pending = t.stops.filter((s) => !s.done);
  const next = pending[0];
  if (next) await notify(db, { parentId: next.parent_id, tripId, kind: 'next', params: { bus: t.bus?.number, trip_kind: t.trip.kind } });
  for (const s of pending) {
    const m = t.etas.get(s.seq);
    if (m != null && m <= 10) await notify(db, { parentId: s.parent_id, tripId, kind: 'ten_min', params: { bus: t.bus?.number, minutes: m, trip_kind: t.trip.kind } });
  }
}

/**
 * Stores the message for the parent's app and sends it as a phone notification.
 * Trip alerts are sent once per family per trip (a unique index guards this).
 */
export async function notify(
  db: DB,
  n: { parentId: string; tripId: string | null; kind: string; params: Record<string, unknown>; perChild?: boolean },
) {
  // Child events (picked up / absent / dropped off) can happen once per child, so they skip the one-per-trip rule.
  const row = { parent_id: n.parentId, trip_id: n.perChild ? null : n.tripId, kind: n.kind, params: { ...n.params, trip_id: n.tripId } };
  const { data, error } = await db.from('notifications').insert(row).select('id').maybeSingle();
  if (error || !data) return; // already sent for this trip
  await pushToParent(db, n.parentId, n.kind, row.params);
}
