'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          /* clipboard refused: the text is visible to copy by hand */
        }
      }}
    >
      {ok ? done : label}
    </button>
  );
}

/** Disables the submit button while the form is sending (uploads can take a few seconds). */
export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="submit"
      className={className}
      aria-busy={busy}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (form && form.checkValidity()) setTimeout(() => setBusy(true), 0);
      }}
      disabled={busy}
    >
      {busy ? '…' : children}
    </button>
  );
}

/**
 * Map where the parent moves the map under a fixed pin (easier on a phone than dragging a pin).
 * Writes the centre into hidden lat/lng inputs.
 */
export function LocationPicker({
  initial,
  labels,
}: {
  initial: { lat: number; lng: number } | null;
  labels: { gps: string; denied: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [pos, setPos] = useState(initial ?? { lat: 30.0131, lng: 31.2089 }); // Giza
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import('leaflet');
      const L = mod.default ?? mod;
      if (cancelled || !box.current || mapRef.current) return;
      const map = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([pos.lat, pos.lng], initial ? 18 : 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      map.on('moveend', () => {
        const c = map.getCenter();
        setPos({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) });
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gps = () => {
    if (!navigator.geolocation) return setMsg(labels.denied);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMsg('');
        mapRef.current?.setView([p.coords.latitude, p.coords.longitude], 18);
      },
      () => setMsg(labels.denied),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="mapwrap">
        <div ref={box} className="map" />
        <div className="pin" aria-hidden="true">
          <svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 3 26 3 16a14 14 0 1 1 28 0c0 10-14 27-14 27z" fill="#B53A25" stroke="#fff" strokeWidth="2.5" /><circle cx="17" cy="16" r="5" fill="#fff" /></svg>
        </div>
      </div>
      <button type="button" className="btn" onClick={gps}>◎ {labels.gps}</button>
      {msg && <p className="small" style={{ color: 'var(--bad)' }}>{msg}</p>}
      <p className="mono small muted">{pos.lat}, {pos.lng}</p>
      <input type="hidden" name="lat" value={pos.lat} />
      <input type="hidden" name="lng" value={pos.lng} />
    </div>
  );
}

type Kid = { name: string; school: string; grade: string; notes: string };

export function ChildrenFields({
  initial,
  schools,
  grades,
  labels,
}: {
  initial: Kid[];
  schools: { id: string; name: string }[];
  grades: { value: string; label: string }[];
  labels: { howMany: string; child: string; name: string; school: string; grade: string; notesPh: string };
}) {
  const [kids, setKids] = useState<Kid[]>(initial.length ? initial : [{ name: '', school: '', grade: '', notes: '' }]);
  const set = (i: number, k: keyof Kid, v: string) => setKids((all) => all.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const resize = (n: number) =>
    setKids((all) => {
      const next = all.slice(0, n);
      while (next.length < n) next.push({ name: '', school: all[0]?.school ?? '', grade: '', notes: '' });
      return next;
    });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span className="label">{labels.howMany}</span>
        <div className="stepper">
          <button type="button" onClick={() => resize(Math.max(1, kids.length - 1))} aria-label="−">−</button>
          <output className="num">{kids.length}</output>
          <button type="button" onClick={() => resize(Math.min(6, kids.length + 1))} aria-label="+">+</button>
        </div>
      </div>
      <input type="hidden" name="count" value={kids.length} />
      {kids.map((k, i) => (
        <fieldset key={i} className="kidcard">
          <legend>{labels.child} {i + 1}</legend>
          <div className="field">
            <label htmlFor={`name_${i}`}>{labels.name}</label>
            <input className="input" id={`name_${i}`} name={`name_${i}`} value={k.name} onChange={(e) => set(i, 'name', e.target.value)} required minLength={2} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor={`school_${i}`}>{labels.school}</label>
              <select className="input" id={`school_${i}`} name={`school_${i}`} value={k.school} onChange={(e) => set(i, 'school', e.target.value)} required>
                <option value="">—</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`grade_${i}`}>{labels.grade}</label>
              <select className="input" id={`grade_${i}`} name={`grade_${i}`} value={k.grade} onChange={(e) => set(i, 'grade', e.target.value)} required>
                <option value="">—</option>
                {grades.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <input className="input" name={`notes_${i}`} value={k.notes} onChange={(e) => set(i, 'notes', e.target.value)} placeholder={labels.notesPh} aria-label={labels.notesPh} />
        </fieldset>
      ))}
    </>
  );
}
