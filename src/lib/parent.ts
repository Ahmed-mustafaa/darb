import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParentSession } from '@/lib/session';
import type { Settings } from '@/lib/pricing';

export type Family = {
  parent: {
    id: string;
    full_name: string;
    phone: string;
    relation: string | null;
    second_name: string | null;
    second_phone: string | null;
    home_lat: number | null;
    home_lng: number | null;
    address: string | null;
    landmark: string | null;
    is_returning: boolean;
  };
  children: { id: string; full_name: string; school_id: string | null; grade: string | null; notes: string | null; bus_id: string | null }[];
  payment: {
    id: string;
    code: string;
    plan: 'month' | 'term' | 'year';
    children_count: number;
    amount: number;
    status: 'awaiting_payment' | 'awaiting_review' | 'paid' | 'rejected' | 'refunded';
    reject_reason: string | null;
    reference: string | null;
  } | null;
};

export const DEFAULT_SETTINGS: Settings = {
  monthly_price: 1500,
  sibling_discount: 15,
  returning_discount: 5,
  term_months: 4,
  term_discount: 5,
  year_months: 9,
  year_discount: 10,
};

/** Loads the signed-in parent's family, or sends them to the start page. */
export async function requireFamily(): Promise<Family> {
  const session = getParentSession();
  if (!session) redirect('/register');
  const db = createAdminClient();
  const [{ data: parent }, { data: children }, { data: payments }] = await Promise.all([
    db.from('parents').select('*').eq('id', session.pid).maybeSingle(),
    db.from('children').select('id, full_name, school_id, grade, notes, bus_id').eq('parent_id', session.pid).order('created_at'),
    db.from('payments').select('id, code, plan, children_count, amount, status, reject_reason, reference').eq('parent_id', session.pid).order('created_at', { ascending: false }).limit(1),
  ]);
  if (!parent) redirect('/register?error=session');
  return { parent, children: children ?? [], payment: payments?.[0] ?? null } as Family;
}

/** Where a family should continue its registration. */
export function nextStep(f: Family): string {
  if (f.parent.home_lat == null) return '/register/location';
  if (!f.children.length) return '/register/children';
  if (!f.payment) return '/register/package';
  if (f.payment.status === 'awaiting_payment' || f.payment.status === 'rejected') return '/register/pay';
  return '/parent';
}

/** Registration details can only change before a receipt is sent. */
export const isLocked = (f: Family) => !!f.payment && ['awaiting_review', 'paid', 'refunded'].includes(f.payment.status);

export async function loadSettings() {
  const db = createAdminClient();
  const { data } = await db.from('settings').select('*').eq('id', 1).maybeSingle();
  return {
    prices: { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings,
    instapay: {
      name: (data?.instapay_name as string | null) ?? null,
      address: (data?.instapay_address as string | null) ?? null,
      mobile: (data?.instapay_mobile as string | null) ?? null,
      link: (data?.instapay_link as string | null) ?? null,
      qrUrl: data?.instapay_qr_path ? db.storage.from('instapay').getPublicUrl(data.instapay_qr_path as string).data.publicUrl : null,
    },
  };
}
