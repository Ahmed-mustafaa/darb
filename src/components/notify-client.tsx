'use client';

import { useEffect, useState } from 'react';

function urlB64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Whether the phone's subscription was made with the key the server uses now. */
function sameKey(sub: PushSubscription, vapidKey: string) {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // browser doesn't say: assume fine
  const a = new Uint8Array(k);
  const b = urlB64ToUint8Array(vapidKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
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
  labels: {
    turnOn: string; on: string; lead: string; blocked: string; ios: string; unsupported: string; test: string;
    testSent: string; demo: string; demoWaiting: string; demoSent: string; errNotConfigured: string; errKeysMismatch: string; errResubscribe: string; errNoSubscription: string; errSendFailed: string; errSignin: string; errOffline: string;
  };
}) {
  const [state, setState] = useState<State>('checking');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [demoLeft, setDemoLeft] = useState(0);

  useEffect(() => {
    if (demoLeft <= 0) return;
    const t = setTimeout(() => setDemoLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [demoLeft]);

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
        let sub = await reg.pushManager.getSubscription();
        if (sub && !sameKey(sub, vapidKey)) {
          // Registered with old keys: Apple would refuse every message. Start over.
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
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

  const test = async (demo = false) => {
    setResult(null);
    if (demo) setDemoLeft(50);
    try {
      // keepalive lets the request carry on after the app is closed
      const res = await fetch(demo ? '/api/push/demo' : '/api/push/test', { method: 'POST', keepalive: demo });
      const body = await res.json().catch(() => ({}));
      setDemoLeft(0);
      if (res.ok) return setResult({ ok: true, text: demo ? labels.demoSent : labels.testSent });
      const why: Record<string, string> = {
        not_configured: labels.errNotConfigured,
        keys_mismatch: labels.errKeysMismatch,
        resubscribe: labels.errResubscribe,
        no_subscription: labels.errNoSubscription,
        send_failed: labels.errSendFailed,
        signin: labels.errSignin,
      };
      setResult({ ok: false, text: `${why[body.error] ?? labels.errSendFailed}${body.detail ? ` (${body.detail})` : ''}` });
      if (body.error === 'no_subscription' || body.error === 'resubscribe') {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
        setState('off');
      }
    } catch {
      setDemoLeft(0);
      // A demo request is cut off when the app is closed; the server still sends the alert.
      setResult(demo ? null : { ok: false, text: labels.errOffline });
    }
  };

  if (state === 'checking') return null;
  return (
    <section className="panel panel-b">
      {state === 'on' ? (
        <>
          <div className="share-live"><span className="live-dot" /><span>{labels.on}</span></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={() => test()} disabled={demoLeft > 0}>{labels.test}</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => test(true)} disabled={demoLeft > 0}>{labels.demo}</button>
          </div>
          {demoLeft > 0 && <p className="notice small"><strong>{demoLeft}s</strong> · {labels.demoWaiting}</p>}
          {result && <p className={result.ok ? 'small' : 'notice bad small'} style={{ overflowWrap: 'anywhere' }}>{result.text}</p>}
        </>
      ) : (
        <>
          <p className="small">{labels.lead}</p>
          {result && !result.ok && <p className="notice bad small" style={{ overflowWrap: 'anywhere' }}>{result.text}</p>}
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
