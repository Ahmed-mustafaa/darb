'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const REASONS = ['not_received', 'wrong_amount', 'unreadable', 'duplicate'];

export async function confirmPayment(f: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString(), reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq('id', String(f.get('id')))
    .eq('status', 'awaiting_review');
  if (error) redirect('/admin/payments?error=generic');
  // Phase 2: send the parent a WhatsApp confirmation here.
  revalidatePath('/admin', 'layout');
  redirect('/admin/payments?ok=confirmed');
}

export async function rejectPayment(f: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const reason = String(f.get('reason') ?? '');
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      reject_reason: REASONS.includes(reason) ? reason : 'not_received',
    })
    .eq('id', String(f.get('id')))
    .eq('status', 'awaiting_review');
  if (error) redirect('/admin/payments?error=generic');
  // Phase 2: tell the parent on WhatsApp why, and let them send a new receipt.
  revalidatePath('/admin', 'layout');
  redirect('/admin/payments?ok=rejected');
}

/** A payment received outside the app (InstaPay or cash), saved as paid. */
export async function recordPayment(f: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const amount = Number(f.get('amount'));
  const plan = String(f.get('plan'));
  const method = f.get('method') === 'cash' ? 'cash' : 'instapay';
  const reference = String(f.get('reference') ?? '').trim() || null;
  const parentId = String(f.get('parent_id') ?? '');
  if (!parentId) redirect('/admin/payments?error=generic#record');
  if (!(amount > 0)) redirect('/admin/payments?error=amount#record');
  const { count } = await supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', parentId);
  const now = new Date().toISOString();
  const { error } = await supabase.from('payments').insert({
    parent_id: parentId,
    plan: ['month', 'term', 'year'].includes(plan) ? plan : 'month',
    children_count: count ?? 1,
    amount,
    method,
    reference,
    status: 'paid',
    paid_at: now,
    submitted_at: now,
    reviewed_by: user?.id ?? null,
    reviewed_at: now,
  });
  if (error) redirect(`/admin/payments?error=${error.code === '23505' ? 'duplicate' : 'generic'}#record`);
  revalidatePath('/admin', 'layout');
  redirect('/admin/payments?ok=1');
}
