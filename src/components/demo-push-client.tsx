'use client';

import { useEffect, useState } from 'react';

/** Admin demo: counts down a minute on this screen, then sends the family the "bus is 10 minutes away" alert. */
export function DemoPushButton({ parentId, labels }: { parentId: string; labels: { button: string; sent: string; failed: string } }) {
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(async () => {
      if (left > 1) return setLeft(left - 1);
      setLeft(0);
      try {
        const res = await fetch('/api/admin/push-demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: parentId }) });
        const body = await res.json().catch(() => ({}));
        setMsg(res.ok ? { ok: true, text: labels.sent } : { ok: false, text: `${labels.failed} (${body.error ?? res.status}${body.detail ? `: ${body.detail}` : ''})` });
      } catch {
        setMsg({ ok: false, text: labels.failed });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [left, parentId, labels]);

  return (
    <span style={{ display: 'grid', gap: 4 }}>
      <button type="button" className="btn btn-sm" disabled={left > 0} onClick={() => { setMsg(null); setLeft(60); }}>
        {left > 0 ? `${left}s…` : labels.button}
      </button>
      {msg && <span className="sub" style={{ color: msg.ok ? 'var(--ok, inherit)' : 'var(--warn)', overflowWrap: 'anywhere' }}>{msg.text}</span>}
    </span>
  );
}
