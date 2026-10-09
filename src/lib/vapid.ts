import { createECDH } from 'crypto';

/** Env values pasted into Vercel often carry quotes, spaces or a line break. */
const clean = (v?: string) => (v ?? '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

export const vapidPublicKey = () => clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) || null;
export const vapidPrivateKey = () => clean(process.env.VAPID_PRIVATE_KEY) || null;

/** Apple refuses the message unless this is a real "mailto:" address or https link. */
export function vapidSubject() {
  const s = clean(process.env.VAPID_SUBJECT);
  if (/^https:\/\//i.test(s)) return s;
  const email = s.replace(/^mailto:/i, '');
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) && !/your@email\.com|example\./i.test(email) ? `mailto:${email}` : 'mailto:admin@darb-app.com';
}

/** True when the private key really belongs to the public key (a common copy-paste mix-up). */
export function vapidKeysMatch() {
  const pub = vapidPublicKey();
  const priv = vapidPrivateKey();
  if (!pub || !priv) return false;
  try {
    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(priv, 'base64url'));
    return ecdh.getPublicKey().toString('base64url') === pub.replace(/=+$/, '');
  } catch {
    return false;
  }
}
