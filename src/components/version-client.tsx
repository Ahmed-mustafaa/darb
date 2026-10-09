'use client';

import { useEffect, useState } from 'react';

const MINE = process.env.NEXT_PUBLIC_APP_VERSION ?? 'local';

/**
 * Checks for a newer published version when the app opens, when it comes back to the
 * foreground, and every minute. If there is one, the screen is blocked until the user updates.
 */
export function VersionGuard({ labels }: { labels: { title: string; text: string; button: string } }) {
  const [outdated, setOutdated] = useState(false);
  const [left, setLeft] = useState(10);

  useEffect(() => {
    if (MINE === 'local') return; // running on your computer: nothing to compare
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { version } = await r.json();
        if (!stop && version && version !== MINE) setOutdated(true);
      } catch {
        /* offline: check again later */
      }
    };
    check();
    const id = setInterval(check, 60_000);
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, []);

  // Update by itself after a short countdown
  useEffect(() => {
    if (!outdated) return;
    if (left <= 0) {
      update();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [outdated, left]);

  if (!outdated) return null;
  return (
    <div className="modal-backdrop update-block" role="alertdialog" aria-modal="true" aria-labelledby="upd-title">
      <div className="modal success">
        <span className="modal-ic" aria-hidden="true">↻</span>
        <h2 id="upd-title">{labels.title}</h2>
        <p>{labels.text}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={update} autoFocus>
          {labels.button} ({left})
        </button>
      </div>
    </div>
  );
}

function update() {
  // Load the newest version of the current page, bypassing anything the phone kept
  const u = new URL(window.location.href);
  u.searchParams.set('v', String(Date.now()));
  window.location.replace(u.toString());
}
