'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';

type LL = { lat: number; lng: number };

/** Refreshes the server-rendered page every few seconds (crew list, statuses). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

/**
 * Sends the phone's GPS position while a trip runs. Keeps the screen awake when the
 * browser allows it. In test mode it can instead drive a fake bus toward the next stop.
 */
export function ShareLocation({
  active,
  nextStop,
  lastKnown,
  testMode,
  labels,
}: {
  active: boolean;
  nextStop: LL | null;
  lastKnown: LL | null;
  testMode: boolean;
  labels: { sharing: string; notSharing: string; lastSent: string; denied: string; keepOpen: string; simulate: string; stopSim: string };
}) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'denied' | 'error'>('idle');
  const [last, setLast] = useState<{ at: number; acc: number | null } | null>(null);
  const [sim, setSim] = useState(false);
  const lastPost = useRef(0);
  const simPos = useRef<LL | null>(lastKnown);

  const post = async (p: { lat: number; lng: number; speed?: number | null; heading?: number | null; accuracy?: number | null }) => {
    try {
      const res = await fetch('/api/crew/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      setStatus(res.ok ? 'ok' : 'error');
      if (res.ok) setLast({ at: Date.now(), acc: p.accuracy ?? null });
    } catch {
      setStatus('error');
    }
  };

  // Real GPS
  useEffect(() => {
    if (!active || sim || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastPost.current < 8000) return; // at most every 8 s
        lastPost.current = Date.now();
        post({ lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed, heading: pos.coords.heading, accuracy: pos.coords.accuracy });
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active, sim]);

  // Keep the screen on during a trip (supported on most Android and recent iPhones)
  useEffect(() => {
    if (!active) return;
    let lock: any = null;
    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {
        /* not allowed: the hint below asks to keep the screen open */
      }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.();
    };
  }, [active]);

  // Test mode: move ~150 m every 3 s toward the next stop
  useEffect(() => {
    if (!sim || !nextStop) return;
    if (!simPos.current) simPos.current = { lat: nextStop.lat + 0.02, lng: nextStop.lng + 0.012 };
    const id = setInterval(() => {
      const cur = simPos.current!;
      const dLat = nextStop.lat - cur.lat;
      const dLng = nextStop.lng - cur.lng;
      const dist = Math.hypot(dLat, dLng);
      const step = 0.0014;
      simPos.current = dist <= step ? { ...nextStop } : { lat: cur.lat + (dLat / dist) * step, lng: cur.lng + (dLng / dist) * step };
      post({ ...simPos.current, speed: 8, accuracy: 5 });
    }, 3000);
    return () => clearInterval(id);
  }, [sim, nextStop?.lat, nextStop?.lng]);

  if (!active) return null;
  const ago = last ? Math.round((Date.now() - last.at) / 1000) : null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className={status === 'ok' ? 'share-live' : 'share-live off'}>
        <span className="live-dot" />
        <div>
          <div>{status === 'ok' ? labels.sharing : labels.notSharing}</div>
          {last && <div className="small">{labels.lastSent}: {ago}s{last.acc ? ` · ±${Math.round(last.acc)} m` : ''}</div>}
        </div>
      </div>
      {status === 'denied' && <p className="notice bad small">{labels.denied}</p>}
      <p className="help">{labels.keepOpen}</p>
      {testMode && nextStop && (
        <button type="button" className="btn btn-sm" onClick={() => setSim((v) => !v)}>
          {sim ? labels.stopSim : labels.simulate}
        </button>
      )}
    </div>
  );
}

export type MapBus = { id: string; number: number; lat: number; lng: number; label?: string; stale?: boolean };

/** OpenStreetMap with bus markers (and optionally the family's home). Updates markers in place. */
export function LiveMap({
  buses,
  home,
  stops,
  height = 320,
  onSelect,
}: {
  buses: MapBus[];
  home?: LL | null;
  stops?: (LL & { done: boolean })[];
  height?: number;
  onSelect?: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const L = useRef<any>(null);
  const layer = useRef<any>(null);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import('leaflet');
      const Lf = mod.default ?? mod;
      if (cancelled || !box.current || map.current) return;
      L.current = Lf;
      map.current = Lf.map(box.current).setView([30.0131, 31.2089], 12);
      Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const Lf = L.current;
    layer.current.clearLayers();
    const pts: [number, number][] = [];
    (stops ?? []).forEach((s) => {
      Lf.circleMarker([s.lat, s.lng], { radius: 6, color: '#0F5C4F', weight: 2.5, fillColor: s.done ? '#0F5C4F' : '#fff', fillOpacity: 1 }).addTo(layer.current);
      pts.push([s.lat, s.lng]);
    });
    if (home) {
      Lf.marker([home.lat, home.lng], {
        icon: Lf.divIcon({ className: '', html: '<div class="map-home">⌂</div>', iconSize: [30, 30], iconAnchor: [15, 15] }),
      }).addTo(layer.current);
      pts.push([home.lat, home.lng]);
    }
    buses.forEach((b) => {
      const m = Lf.marker([b.lat, b.lng], {
        icon: Lf.divIcon({ className: '', html: `<div class="map-bus${b.stale ? ' stale' : ''}">${b.number}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
        zIndexOffset: 1000,
      }).addTo(layer.current);
      if (b.label) m.bindTooltip(b.label);
      if (onSelect) m.on('click', () => onSelect(b.id));
      pts.push([b.lat, b.lng]);
    });
    if (!fitted.current && pts.length) {
      fitted.current = true;
      if (pts.length === 1) map.current.setView(pts[0], 15);
      else map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    }
  }, [ready, buses, home, stops, onSelect]);

  return <div ref={box} style={{ height, width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--surface-2)' }} />;
}
