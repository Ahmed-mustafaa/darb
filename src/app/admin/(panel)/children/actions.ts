'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeEgPhone } from '@/lib/phone';
import { parseLatLng } from '@/lib/geo';
import { done } from '@/lib/flash';

function back(f: FormData, extra: string) {
  const ret = String(f.get('return') ?? '/admin/children');
  const safe = ret.startsWith('/admin/children') ? ret : '/admin/children';
  return safe + (safe.includes('?') ? '&' : '?') + extra;
}

export async function assignChild(f: FormData) {
  const supabase = createClient();
  const busId = String(f.get('bus_id') ?? '');
  const { error } = await supabase
    .from('children')
    .update({ bus_id: busId || null })
    .eq('id', String(f.get('child_id')));
  revalidatePath('/admin', 'layout');
  if (error) redirect(back(f, error.message.includes('BUS_FULL') ? 'error=full' : 'error=generic'));
  const { data: kid } = await supabase.from('children').select('full_name').eq('id', String(f.get('child_id'))).maybeSingle();
  const { data: bus } = busId ? await supabase.from('buses').select('number').eq('id', busId).maybeSingle() : { data: null };
  redirect(done(back(f, 'ok=1'), busId ? 'childMoved' : 'childRemoved', { name: kid?.full_name ?? '', n: bus?.number ?? '' }));
}

export async function acceptAll(f: FormData) {
  const supabase = createClient();
  const pairs = JSON.parse(String(f.get('pairs') ?? '[]')) as { childId: string; busId: string }[];
  let failed = false;
  let count = 0;
  for (const p of pairs) {
    const { error } = await supabase.from('children').update({ bus_id: p.busId }).eq('id', p.childId);
    if (error) failed = true;
    else count++;
  }
  revalidatePath('/admin', 'layout');
  if (failed) redirect(back(f, 'error=full'));
  redirect(done(back(f, 'ok=1'), 'childrenAssigned', { n: count }));
}

/** Adds a child (and the parent, if this phone number is new) from paper or Excel records. */
export async function addChild(f: FormData) {
  const supabase = createClient();
  const parentName = String(f.get('parent_name') ?? '').trim();
  const phone = normalizeEgPhone(String(f.get('phone') ?? ''));
  const childName = String(f.get('child_name') ?? '').trim();
  const locRaw = String(f.get('location') ?? '').trim();
  const loc = parseLatLng(locRaw);
  if (!childName || parentName.length < 3) redirect('/admin/children?error=name#add');
  if (!phone) redirect('/admin/children?error=phone#add');
  if (locRaw && !loc) redirect('/admin/children?error=coords#add');

  let parentId: string | null = null;
  const { data: existing } = await supabase.from('parents').select('id').eq('phone', phone).maybeSingle();
  if (existing) {
    parentId = existing.id;
    if (loc) await supabase.from('parents').update({ home_lat: loc.lat, home_lng: loc.lng }).eq('id', parentId);
  } else {
    const { data, error } = await supabase
      .from('parents')
      .insert({
        full_name: parentName,
        phone,
        home_lat: loc?.lat ?? null,
        home_lng: loc?.lng ?? null,
        address: String(f.get('address') ?? '').trim() || null,
      })
      .select('id')
      .single();
    if (error || !data) redirect('/admin/children?error=generic#add');
    parentId = data.id;
  }

  const busId = String(f.get('bus_id') ?? '');
  const { error } = await supabase.from('children').insert({
    parent_id: parentId,
    full_name: childName,
    school_id: String(f.get('school_id') ?? '') || null,
    grade: String(f.get('grade') ?? '') || null,
    notes: String(f.get('notes') ?? '').trim() || null,
    bus_id: busId || null,
  });
  revalidatePath('/admin', 'layout');
  if (error) redirect(`/admin/children?error=${error.message.includes('BUS_FULL') ? 'full' : 'generic'}#add`);
  redirect(done('/admin/children?ok=added', 'childAdded', { name: childName }));
}

export async function deleteChild(f: FormData) {
  const supabase = createClient();
  await supabase.from('children').delete().eq('id', String(f.get('child_id')));
  revalidatePath('/admin', 'layout');
  redirect(done(back(f, 'ok=1'), 'childDeleted'));
}
