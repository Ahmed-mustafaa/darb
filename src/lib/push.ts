import * as webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifText } from '@/lib/notify-text';
import { vapidKeysMatch, vapidPrivateKey, vapidPublicKey, vapidSubject } from '@/lib/vapid';

type DB = SupabaseClient<any, any, any>;

let configured: boolean | null = null;
/** Phone notifications need VAPID keys (README: "Phone notifications"). Without them nothing is sent. */
export function pushReady() {
  if (configured !== null) return configured;
  const pub = vapidPublicKey();
  const priv = vapidPrivateKey();
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(vapidSubject(), pub, priv);
  return (configured = true);
}

/** What's wrong with the server's notification setup, if anything. */
export function pushProblem(): 'not_configured' | 'keys_mismatch' | null {
  if (!pushReady()) return 'not_configured';
  if (!vapidKeysMatch()) return 'keys_mismatch';
  return null;
}

const TITLE = { ar: 'درب', en: 'Darb' };

/** Sends a notification to every phone the parent turned notifications on for. */
export async function pushToParent(db: DB, parentId: string, kind: string, params: Record<string, any>): Promise<{ sent: number; failed: string[]; phones: number; stale: number }> {
  if (!pushReady()) return { sent: 0, failed: ['not_configured'], phones: 0, stale: 0 };
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth, lang').eq('parent_id', parentId);
  if (!subs?.length) return { sent: 0, failed: [], phones: 0, stale: 0 };
  let sent = 0;
  let stale = 0;
  const failed: string[] = [];
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
        sent++;
      } catch (e: any) {
        // The phone unsubscribed or the browser data was cleared: forget it.
        failed.push(`${e?.statusCode ?? ''} ${String(e?.body ?? e?.message ?? '').slice(0, 120)}`.trim());
        // 404/410: the phone unsubscribed. 401/403: the phone registered with older keys, so it must turn notifications on again.
        if ([401, 403, 404, 410].includes(e?.statusCode)) {
          stale++;
          await db.from('push_subscriptions').delete().eq('id', s.id);
        }
        else console.error('Push failed', e?.statusCode, e?.body ?? e?.message);
      }
    }),
  );
  return { sent, failed, phones: subs.length, stale };
}

/** Demo: a realistic "bus is 10 minutes away" alert, using the bus of the parent's first child. */
export async function pushDemo(db: DB, parentId: string) {
  const { data: kids } = await db.from('children').select('bus_id').eq('parent_id', parentId).not('bus_id', 'is', null).limit(1);
  const busId = kids?.[0]?.bus_id;
  const { data: bus } = busId ? await db.from('buses').select('number').eq('id', busId).maybeSingle() : { data: null };
  return pushToParent(db, parentId, 'ten_min', { bus: bus?.number ?? 1, minutes: 10 });
}

/** Whether the parent has at least one phone registered for notifications. */
export async function hasPhone(db: DB, parentId: string) {
  const { count } = await db.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('parent_id', parentId);
  return (count ?? 0) > 0;
}
