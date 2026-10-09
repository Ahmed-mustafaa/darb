'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveMap } from './live-client';

type Track = {
  home: { lat: number; lng: number } | null;
  trips: {
    id: string;
    kind: 'morning' | 'afternoon';
    bus: number;
    location: { lat: number; lng: number; updated_at: string } | null;
    eta: number | null;
    stopsBefore: number;
    isNext: boolean;
    done: boolean;
    children: { name: string; status: string }[];
  }[];
  messages: { id: string; at: string; kind: string; text: string }[];
};

type Labels = Record<
  'noTrip' | 'noTripLead' | 'minAway' | 'stopsBefore' | 'youreNext' | 'doneTrip' | 'updated' | 'secAgo' | 'minAgo' | 'noSignal' | 'messages' | 'bus' | 'pickedUp' | 'onBus' | 'absent' | 'droppedOff' | 'waiting',
  string
>;

/** The parent's live view: polls every 10 s, shows the bus on a map and pops up new alerts. */
export function ParentTracker({ labels, locale }: { labels: Labels; locale: 'ar' | 'en' }) {
  const [data, setData] = useState<Track | null>(null);
  const [pop, setPop] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch('/api/track', { cache: 'no-store' });
        if (!res.ok) return;
        const d: Track = await res.json();
        if (stop) return;
        // Pop up messages that arrived since the page opened
        if (seen.current) {
          const fresh = d.messages.filter((m) => !seen.current!.has(m.id) && (m.kind === 'next' || m.kind === 'ten_min'));
          if (fresh.length) {
            setPop(fresh[0].text);
            try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
            setTimeout(() => setPop(null), 9000);
          }
        }
        seen.current = new Set(d.messages.map((m) => m.id));
        setData(d);
      } catch {
        /* offline: try again next tick */
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (!data) return null;
  const status = (s: string, kind: string) =>
    s === 'picked_up' ? (kind === 'morning' ? labels.pickedUp : labels.onBus) : s === 'absent' ? labels.absent : s === 'dropped_off' ? labels.droppedOff : labels.waiting;
  const ago = (iso: string) => {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    return s < 90 ? `${s} ${labels.secAgo}` : `${Math.round(s / 60)} ${labels.minAgo}`;
  };
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });

  return (
    <div className="stack">
      {pop && <div className="alert-pop" role="alert" onClick={() => setPop(null)}>{pop}</div>}

      {data.trips.length === 0 ? (
        <section className="panel panel-b">
          <strong>{labels.noTrip}</strong>
          <p className="small muted">{labels.noTripLead}</p>
        </section>
      ) : (
        data.trips.map((tr) => (
          <section key={tr.id} className="paybox">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <strong>{labels.bus} {tr.bus}</strong>
              {tr.location && <span className="small muted">{labels.updated} {ago(tr.location.updated_at)}</span>}
            </div>
            {tr.done ? (
              <div className="bigeta" style={{ fontSize: 26 }}>{labels.doneTrip}</div>
            ) : tr.eta != null ? (
              <div>
                <div className="bigeta">{tr.eta}<small> {labels.minAway}</small></div>
                <p className="small muted">{tr.isNext ? labels.youreNext : `${tr.stopsBefore} ${labels.stopsBefore}`}</p>
              </div>
            ) : (
              <p className="muted">{tr.isNext ? labels.youreNext : labels.noSignal}</p>
            )}
            {tr.location && (
              <LiveMap
                height={280}
                home={data.home}
                buses={[{ id: tr.id, number: tr.bus, lat: tr.location.lat, lng: tr.location.lng, stale: Date.now() - new Date(tr.location.updated_at).getTime() > 120000 }]}
              />
            )}
            <div style={{ display: 'grid', gap: 6 }}>
              {tr.children.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{c.name}</span>
                  <span className={c.status === 'waiting' ? 'chip' : c.status === 'absent' ? 'chip warn' : 'chip ok'}>{status(c.status, tr.kind)}</span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {data.messages.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>{labels.messages}</h2></div>
          <div className="panel-b">
            {data.messages.map((m) => (
              <div key={m.id} className="msg"><span>{m.text}</span><time>{time(m.at)}</time></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
