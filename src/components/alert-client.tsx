'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type Kind = 'success' | 'error';

/** A message in the middle of a dimmed screen, closed with OK (or Escape / tapping outside). */
export function AlertModal({ kind, title, text, ok, onClose }: { kind: Kind; title: string; text: string; ok: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${kind}`} role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-text" onClick={(e) => e.stopPropagation()}>
        <span className="modal-ic" aria-hidden="true">{kind === 'success' ? '✓' : '!'}</span>
        <h2 id="modal-title">{title}</h2>
        <p id="modal-text">{text}</p>
        <button type="button" className={kind === 'success' ? 'btn btn-primary btn-block' : 'btn btn-block'} onClick={onClose} autoFocus>
          {ok}
        </button>
      </div>
    </div>
  );
}

/** Removes our one-time parameters from the address bar without reloading the page. */
function stripParams(names: (n: string) => boolean) {
  try {
    const u = new URL(window.location.href);
    [...u.searchParams.keys()].filter(names).forEach((k) => u.searchParams.delete(k));
    window.history.replaceState(window.history.state, '', u.pathname + (u.search ? u.search : '') + u.hash);
  } catch {
    /* ignore */
  }
}

/** Shows the confirmation an action put in the URL (?done=…), then cleans the URL. */
export function ResultAlert({ messages, title, ok }: { messages: Record<string, string>; title: string; ok: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const key = params.get('done');
    if (!key) return;
    const template = messages[key];
    if (template) {
      setText(template.replace(/\{(\w+)\}/g, (_, k) => params.get('d_' + k) ?? ''));
    }
    stripParams((k) => k === 'done' || k === 'ok' || k.startsWith('d_') || k === 'assigned');
  }, [params, pathname, messages]);

  if (!text) return null;
  return <AlertModal kind="success" title={title} text={text} ok={ok} onClose={() => setText(null)} />;
}

/** Shows an error message as an alert once; the same message also stays on the page. */
export function ErrorAlert({ text, title, ok }: { text: string; title: string; ok: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    stripParams((k) => k === 'error' || k === 'detail');
  }, [text]);
  if (!open) return null;
  return <AlertModal kind="error" title={title} text={text} ok={ok} onClose={() => setOpen(false)} />;
}
