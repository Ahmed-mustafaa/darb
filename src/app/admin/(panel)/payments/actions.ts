'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { autoAssignFamily } from '@/lib/assign';
import { done } from '@/lib/flash';
import { periodFor } from '@/lib/subscription';

const REASONS = ['not_received', 'wrong_amount', 'unreadable', 'duplicate'];

export async function confirmPayment(f: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString(), reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq('id', String(f.get('id')))
    .eq('status', 'awaiting_review')
    .select('parent_id')
    .maybeSingle();
  if (error) redirect('/admin/payments?error=generic');
  if (data?.parent_id) {
    // The subscription runs from today (or right after the current one ends) for the package's months.
    const { data: pay } = await supabase.from('payments').select('id, plan, kind, child_ids').eq('id', String(f.get('id'))).maybeSingle();
    if (pay?.kind === 'addon') {
      // Added children ride until the end date already on the payment
      if (pay.child_ids?.length) await supabase.from('children').update({ pending: false }).in('id', pay.child_ids);
    } else if (pay) {
      await supabase.from('payments').update(await periodFor(supabase, data.parent_id, pay.plan, pay.id)).eq('id', pay.id);
      await supabase.from('children').update({ pending: false }).eq('parent_id', data.parent_id);
    }
  }
  // Put the family's children on the best bus straight away; the admin can still move them.
  const assigned = data?.parent_id ? await autoAssignFamily(supabase, data.parent_id) : 0;
  revalidatePath('/admin', 'layout');
  redirect(done(`/admin/payments?ok=confirmed&assigned=${assigned}`, 'paymentConfirmed', { n: assigned }));
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
  // The parent sees the reason on their status page and can send a new receipt.
  revalidatePath('/admin', 'layout');
  redirect(done('/admin/payments?ok=rejected', 'paymentRejected'));
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
  const validPlan = (['month', 'term', 'year'].includes(plan) ? plan : 'month') as 'month' | 'term' | 'year';
  const period = await periodFor(supabase, parentId, validPlan);
  const { error } = await supabase.from('payments').insert({
    ...period,
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
  redirect(done('/admin/payments?ok=1', 'paymentRecorded'));
}
