'use client';

import { useEffect, useState } from 'react';

function urlB64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = 'checking' | 'off' | 'on' | 'blocked' | 'ios' | 'unsupported' | 'busy';

/**
 * "Turn on notifications" for the parent's phone. Registers the service worker,
 * asks permission and saves the subscription so bus alerts arrive even when the app is closed.
 */
export function NotifyButton({
  vapidKey,
  labels,
}: {
  vapidKey: string | null;
  labels: { turnOn: string; on: string; lead: string; blocked: string; ios: string; unsupported: string; test: string };
}) {
  const [state, setState] = useState<State>('checking');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return setState(ios && !standalone ? 'ios' : 'unsupported');
      }
      if (!vapidKey) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('blocked');
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === 'granted') {
          // Keep the server copy fresh (also covers a language change)
          await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
          return setState('on');
        }
      } catch {
        /* fall through to "off" */
      }
      setState('off');
    })();
  }, [vapidKey]);

  const turnOn = async () => {
    if (!vapidKey) return;
    setState('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'off');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey) }));
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      setState(res.ok ? 'on' : 'off');
    } catch {
      setState('off');
    }
  };

  const test = async () => {
    await fetch('/api/push/test', { method: 'POST' }).catch(() => null);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  if (state === 'checking') return null;
  return (
    <section className="panel panel-b">
      {state === 'on' ? (
        <>
          <div className="share-live"><span className="live-dot" /><span>{labels.on}</span></div>
          <button type="button" className="btn btn-sm" onClick={test} style={{ justifySelf: 'start' }}>{sent ? '✓' : labels.test}</button>
        </>
      ) : (
        <>
          <p className="small">{labels.lead}</p>
          {state === 'ios' && <p className="notice bad small">{labels.ios}</p>}
          {state === 'blocked' && <p className="notice bad small">{labels.blocked}</p>}
          {state === 'unsupported' && <p className="small muted">{labels.unsupported}</p>}
          {(state === 'off' || state === 'busy') && (
            <button type="button" className="btn btn-primary btn-block" onClick={turnOn} disabled={state === 'busy'}>
              {state === 'busy' ? '…' : labels.turnOn}
            </button>
          )}
        </>
      )}
    </section>
  );
}
