'use client';

import { useCallback, useEffect, useState } from 'react';
import { LiveMap } from './live-client';

type Person = { full_name: string; phone: string } | null;
type Bus = {
  id: string;
  number: number;
  driver: Person;
  supervisor: Person;
  trip: { id: string; kind: 'morning' | 'afternoon'; started_at: string } | null;
  location: { lat: number; lng: number; speed: number | null; accuracy: number | null; updated_at: string } | null;
  progress: { done: number; total: number; next: string | null; nextEta: number | null; stops: { lat: number; lng: number; done: boolean }[] } | null;
};

export function AdminLive({ labels }: { labels: Record<string, string> }) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/api/admin/live', { cache: 'no-store' });
        if (r.ok && !stop) setBuses((await r.json()).buses);
      } catch {
        /* retry next tick */
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const onSelect = useCallback((id: string) => setSel(id), []);
  const ago = (iso: string) => {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    return s < 90 ? `${s}s` : s < 5400 ? `${Math.round(s / 60)}m` : new Date(iso).toLocaleString();
  };
  const located = buses.filter((b) => b.location);
  const selected = buses.find((b) => b.id === sel);

  return (
    <div className="livegrid">
      <LiveMap
        height={520}
        onSelect={onSelect}
        stops={selected?.progress?.stops}
        buses={located.map((b) => ({
          id: b.id,
          number: b.number,
          lat: b.location!.lat,
          lng: b.location!.lng,
          label: `${labels.bus} ${b.number}`,
          stale: !b.trip || Date.now() - new Date(b.location!.updated_at).getTime() > 120000,
        }))}
      />
      <div className="stack">
        {buses.map((b) => (
          <button
            key={b.id}
            type="button"
            className="card"
            onClick={() => setSel(b.id)}
            style={{ textAlign: 'start', cursor: 'pointer', borderColor: sel === b.id ? 'var(--accent)' : undefined }}
          >
            <div className="card-t">
              <h3 style={{ fontSize: 18 }}>{labels.bus} {b.number}</h3>
              <span className={b.trip ? 'chip ok' : 'chip'}>{b.trip ? (b.trip.kind === 'morning' ? labels.morning : labels.afternoon) : labels.notRunning}</span>
            </div>
            {b.progress && (
              <span className="small">
                {b.progress.done}/{b.progress.total} {labels.stopsDone}
                {b.progress.next && <> · {labels.next}: <b>{b.progress.next}</b>{b.progress.nextEta != null && ` (${b.progress.nextEta} ${labels.min})`}</>}
              </span>
            )}
            <span className="small muted">
              {b.location ? `${labels.lastPing}: ${ago(b.location.updated_at)}${b.location.speed != null ? ` · ${Math.round(b.location.speed)} km/h` : ''}` : labels.noLocation}
            </span>
            <span className="small muted">
              {b.driver?.full_name ?? '—'} · {b.supervisor?.full_name ?? '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
