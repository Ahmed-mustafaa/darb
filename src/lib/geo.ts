export type LatLng = { lat: number; lng: number };

/** Straight-line distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Accepts "30.0131, 31.2089" (as copied from Google Maps) and returns a point, or null. */
export function parseLatLng(input: string | null | undefined): LatLng | null {
  if (!input) return null;
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function formatKm(km: number, locale: 'ar' | 'en'): string {
  if (km < 1) {
    const m = Math.round((km * 1000) / 10) * 10;
    return locale === 'ar' ? `${m} م` : `${m} m`;
  }
  return locale === 'ar' ? `${km.toFixed(1)} كم` : `${km.toFixed(1)} km`;
}

export type SuggestBus = {
  id: string;
  number: number;
  capacity: number;
  school_id: string | null;
  used: number;
  homes: LatLng[]; // homes of children already on the bus
};
export type SuggestChild = { id: string; school_id: string | null; home: LatLng | null };
export type Suggestion = { childId: string; busId: string | null; km: number | null; reason: 'nearest' | 'least_full' | 'no_seat' };

/**
 * Picks a bus for each unassigned child.
 * Only buses going to the child's school with a free seat are considered.
 * Among them, the bus whose existing pickups are closest to the child's home wins;
 * if the child has no home pin, the emptiest bus wins.
 */
export function suggestBuses(kids: SuggestChild[], buses: SuggestBus[], schools: Record<string, LatLng | null>): Suggestion[] {
  const load = new Map(buses.map((b) => [b.id, b.used]));
  const homes = new Map(buses.map((b) => [b.id, [...b.homes]]));
  const out: Suggestion[] = [];

  for (const kid of kids) {
    const options = buses.filter((b) => b.school_id === kid.school_id && (load.get(b.id) ?? 0) < b.capacity);
    if (!options.length) {
      out.push({ childId: kid.id, busId: null, km: null, reason: 'no_seat' });
      continue;
    }
    let best: { bus: SuggestBus; km: number | null } | null = null;
    for (const bus of options) {
      let km: number | null = null;
      if (kid.home) {
        const points = homes.get(bus.id)!;
        const school = bus.school_id ? schools[bus.school_id] : null;
        const targets = points.length ? points : school ? [school] : [];
        if (targets.length) km = Math.min(...targets.map((p) => distanceKm(kid.home!, p)));
      }
      if (
        !best ||
        (km !== null && (best.km === null || km < best.km)) ||
        (km === null && best.km === null && (load.get(bus.id) ?? 0) < (load.get(best.bus.id) ?? 0))
      ) {
        best = { bus, km };
      }
    }
    const chosen = best!;
    load.set(chosen.bus.id, (load.get(chosen.bus.id) ?? 0) + 1);
    if (kid.home) homes.get(chosen.bus.id)!.push(kid.home);
    out.push({ childId: kid.id, busId: chosen.bus.id, km: chosen.km, reason: chosen.km === null ? 'least_full' : 'nearest' });
  }
  return out;
}
