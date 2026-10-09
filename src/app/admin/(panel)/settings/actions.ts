'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseLatLng } from '@/lib/geo';

const pct = (v: FormDataEntryValue | null) => Math.min(80, Math.max(0, Number(v) || 0));

export async function savePrices(f: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    monthly_price: Math.max(0, Number(f.get('monthly_price')) || 0),
    sibling_discount: pct(f.get('sibling_discount')),
    returning_discount: pct(f.get('returning_discount')),
    term_months: Math.max(1, Number(f.get('term_months')) || 4),
    term_discount: pct(f.get('term_discount')),
    year_months: Math.max(1, Number(f.get('year_months')) || 9),
    year_discount: pct(f.get('year_discount')),
    updated_at: new Date().toISOString(),
  });
  if (error) redirect('/admin/settings?error=generic');
  revalidatePath('/admin/settings');
  redirect('/admin/settings?ok=1');
}

export async function addSchool(f: FormData) {
  const supabase = createClient();
  const name_ar = String(f.get('name_ar') ?? '').trim();
  const name_en = String(f.get('name_en') ?? '').trim();
  const locRaw = String(f.get('location') ?? '').trim();
  const loc = parseLatLng(locRaw);
  if (!name_ar || !name_en) redirect('/admin/settings?error=name');
  if (locRaw && !loc) redirect('/admin/settings?error=coords');
  const { error } = await supabase.from('schools').insert({ name_ar, name_en, lat: loc?.lat ?? null, lng: loc?.lng ?? null });
  if (error) redirect('/admin/settings?error=generic');
  revalidatePath('/admin', 'layout');
  redirect('/admin/settings?ok=1');
}

export async function deleteSchool(f: FormData) {
  const supabase = createClient();
  const id = String(f.get('id'));
  const [{ count: b }, { count: c }] = await Promise.all([
    supabase.from('buses').select('id', { count: 'exact', head: true }).eq('school_id', id),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('school_id', id),
  ]);
  if ((b ?? 0) + (c ?? 0) > 0) redirect('/admin/settings?error=inuse');
  await supabase.from('schools').delete().eq('id', id);
  revalidatePath('/admin', 'layout');
  redirect('/admin/settings?ok=1');
}
