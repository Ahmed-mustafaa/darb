import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifText } from '@/lib/notify-text';

type DB = SupabaseClient<any, any, any>;

let configured: boolean | null = null;
/** Phone notifications need VAPID keys (README: "Phone notifications"). Without them nothing is sent. */
export function pushReady() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@darb.app', pub, priv);
  return (configured = true);
}

const TITLE = { ar: 'درب', en: 'Darb' };

/** Sends a notification to every phone the parent turned notifications on for. */
export async function pushToParent(db: DB, parentId: string, kind: string, params: Record<string, any>) {
  if (!pushReady()) return;
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth, lang').eq('parent_id', parentId);
  if (!subs?.length) return;
  const ids: string[] = Array.isArray(params.child_ids) ? params.child_ids : [];
  const { data: kids } = ids.length ? await db.from('children').select('full_name').in('id', ids) : { data: [] as { full_name: string }[] };
  const names = (kids ?? []).map((k) => k.full_name.split(' ')[0]);

  await Promise.all(
    subs.map(async (s) => {
      const lang = s.lang === 'en' ? 'en' : 'ar';
      const body = kind === 'test' ? (lang === 'ar' ? 'الإشعارات تعمل على هذا الموبايل ✓' : 'Notifications work on this phone ✓') : notifText(kind, params, names, lang);
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: TITLE[lang], body, url: '/parent', tag: kind === 'ten_min' || kind === 'next' ? 'bus-arrival' : kind }),
          { TTL: 15 * 60, urgency: kind === 'next' || kind === 'ten_min' ? 'high' : 'normal' },
        );
      } catch (e: any) {
        // The phone unsubscribed or the browser data was cleared: forget it.
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('Push failed', e?.statusCode, e?.body ?? e?.message);
      }
    }),
  );
}
