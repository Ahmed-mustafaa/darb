'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeEgPhone } from '@/lib/phone';
import { MIN_PASSWORD, hashPassword } from '@/lib/password';
import { flash } from '@/lib/flash';

export async function addStaff(f: FormData) {
  const supabase = createClient();
  const full_name = String(f.get('full_name') ?? '').trim();
  const phone = normalizeEgPhone(String(f.get('phone') ?? ''));
  const role = f.get('role') === 'supervisor' ? 'supervisor' : 'driver';
  const busId = String(f.get('bus_id') ?? '');
  const expiry = String(f.get('license_expiry') ?? '');
  if (full_name.length < 3) redirect('/admin/staff?error=name');
  if (!phone) redirect('/admin/staff?error=phone');
  const password = String(f.get('password') ?? '');
  if (password.length < MIN_PASSWORD) redirect('/admin/staff?error=pwshort');

  const { data, error } = await supabase
    .from('staff')
    .insert({ full_name, phone, role, license_expiry: role === 'driver' && expiry ? expiry : null, password_hash: await hashPassword(password) })
    .select('id')
    .single();
  if (error) redirect(`/admin/staff?error=${error.code === '23505' ? 'duplicate' : 'generic'}`);

  if (busId && data) {
    const col = role === 'driver' ? 'driver_id' : 'supervisor_id';
    await supabase.from('buses').update({ [col]: data.id }).eq('id', busId);
  }
  revalidatePath('/admin', 'layout');
  flash('personAdded', { name: full_name });
  redirect('/admin/staff?ok=1');
}

/** Moves a person to a bus (or off all buses when bus_id is empty). */
export async function assignStaff(f: FormData) {
  const supabase = createClient();
  const id = String(f.get('id'));
  const role = f.get('role') === 'supervisor' ? 'supervisor' : 'driver';
  const busId = String(f.get('bus_id') ?? '');
  const col = role === 'driver' ? 'driver_id' : 'supervisor_id';
  await supabase.from('buses').update({ [col]: null }).eq(col, id);
  if (busId) {
    const { error } = await supabase.from('buses').update({ [col]: id }).eq('id', busId);
    if (error) redirect('/admin/staff?error=generic');
  }
  revalidatePath('/admin', 'layout');
  flash('assignmentSaved');
  redirect('/admin/staff?ok=1');
}

/** The office sets (or resets) the password a driver or supervisor uses in the crew app. */
export async function setStaffPassword(f: FormData) {
  const supabase = createClient();
  const password = String(f.get('password') ?? '');
  if (password.length < MIN_PASSWORD) redirect('/admin/staff?error=pwshort');
  const { error } = await supabase.from('staff').update({ password_hash: await hashPassword(password) }).eq('id', String(f.get('id')));
  if (error) redirect('/admin/staff?error=generic');
  revalidatePath('/admin/staff');
  flash('passwordSet');
  redirect('/admin/staff?ok=pw');
}

export async function toggleActive(f: FormData) {
  const supabase = createClient();
  const id = String(f.get('id'));
  const active = f.get('active') === 'true';
  if (!active) {
    await supabase.from('buses').update({ driver_id: null }).eq('driver_id', id);
    await supabase.from('buses').update({ supervisor_id: null }).eq('supervisor_id', id);
  }
  await supabase.from('staff').update({ active }).eq('id', id);
  revalidatePath('/admin', 'layout');
  flash('staffActive');
  redirect('/admin/staff?ok=1');
}
