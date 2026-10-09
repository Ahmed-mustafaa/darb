import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanId } from '@/lib/pricing';

type DB = SupabaseClient<any, any, any>;

/** Today's date in Cairo as YYYY-MM-DD. */
export function todayCairo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const parse = (d: string) => new Date(d + 'T00:00:00Z');
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmt(new Date(parse(d).getTime() + n * 864e5));
export function addMonths(d: string, n: number) {
  const x = parse(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return fmt(x);
}
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

/**
 * Start and end of the period a newly confirmed payment covers. Starts today,
 * or the day after the family's current subscription ends if they renewed early.
 */
export async function periodFor(db: DB, parentId: string, plan: PlanId, excludePaymentId?: string) {
  const [{ data: settings }, { data: prev }] = await Promise.all([
    db.from('settings').select('term_months, year_months').eq('id', 1).maybeSingle(),
    db
      .from('payments')
      .select('id, valid_until')
      .eq('parent_id', parentId)
      .eq('status', 'paid')
      .not('valid_until', 'is', null)
      .order('valid_until', { ascending: false })
      .limit(2),
  ]);
  const months = plan === 'month' ? 1 : plan === 'term' ? settings?.term_months ?? 4 : settings?.year_months ?? 9;
  const today = todayCairo();
  const lastEnd = (prev ?? []).find((p: any) => p.id !== excludePaymentId)?.valid_until as string | undefined;
  const from = lastEnd && lastEnd >= today ? addDays(lastEnd, 1) : today;
  return { valid_from: from, valid_until: addDays(addMonths(from, months), -1) };
}

export function formatDate(d: string | null | undefined, locale: 'ar' | 'en') {
  if (!d) return '—';
  return parse(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
