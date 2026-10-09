'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseLatLng } from '@/lib/geo';
import { flash } from '@/lib/flash';

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
  flash('pricesSaved');
  redirect('/admin/settings?ok=1');
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Saves the owner's InstaPay details and, if a new image was chosen, the QR code. */
export async function saveInstapay(f: FormData) {
  const supabase = createClient();
  const text = (k: string) => String(f.get(k) ?? '').trim() || null;
  const link = text('instapay_link');
  if (link && !/^https:\/\//i.test(link)) redirect('/admin/settings?error=link#instapay');

  const update: Record<string, string | null> = {
    instapay_name: text('instapay_name'),
    instapay_address: text('instapay_address'),
    instapay_mobile: text('instapay_mobile'),
    instapay_link: link,
  };

  const file = f.get('qr');
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) redirect('/admin/settings?error=image#instapay');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `qr-${Date.now()}.${ext}`; // new name each time so phones never show a cached old QR
    const { error } = await supabase.storage.from('instapay').upload(path, file, { contentType: file.type });
    if (error) redirect('/admin/settings?error=upload#instapay');
    const { data: old } = await supabase.from('settings').select('instapay_qr_path').eq('id', 1).maybeSingle();
    if (old?.instapay_qr_path) await supabase.storage.from('instapay').remove([old.instapay_qr_path]);
    update.instapay_qr_path = path;
  }

  const { error } = await supabase.from('settings').update({ ...update, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) redirect('/admin/settings?error=generic#instapay');
  revalidatePath('/admin/settings');
  flash('instapaySaved');
  redirect('/admin/settings?ok=1#instapay');
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
  flash('schoolAdded');
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
  flash('schoolDeleted');
  redirect('/admin/settings?ok=1');
}
