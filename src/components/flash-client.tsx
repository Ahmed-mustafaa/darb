'use client';

import { useEffect, useState } from 'react';

const NAME = 'darb_flash';

function readFlash(): { k: string; p: Record<string, string | number> } | null {
  const m = document.cookie.split('; ').find((c) => c.startsWith(NAME + '='));
  if (!m) return null;
  document.cookie = `${NAME}=; path=/; max-age=0`;
  try {
    let b64 = decodeURIComponent(m.slice(NAME.length + 1)).replace(/-/g, '+').replace(/_/g, '/');
    b64 += '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Shows the pop-up queued by the last action (see lib/flash.ts). */
export function FlashToast({ messages }: { messages: Record<string, string> }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const f = readFlash();
      if (!f || !messages[f.k]) return;
      const msg = messages[f.k].replace(/\{(\w+)\}/g, (_, k) => String(f.p?.[k] ?? ''));
      setText(msg);
      clearTimeout(hide);
      hide = setTimeout(() => setText(null), 3800);
    };
    check();
    const id = setInterval(check, 400); // actions redirect without a full reload, so keep an eye out
    return () => {
      clearInterval(id);
      clearTimeout(hide);
    };
  }, [messages]);

  return (
    <div className={text ? 'flash show' : 'flash'} role="status" aria-live="polite" onClick={() => setText(null)}>
      {text && <><span className="flash-ic" aria-hidden="true">✓</span><span>{text}</span></>}
    </div>
  );
}
