'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { flash } from '@/lib/flash';

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim();
  return v === '' ? null : v;
};

export async function addBus(f: FormData) {
  const supabase = createClient();
  const number = Number(f.get('number'));
  const { error } = await supabase.from('buses').insert({
    number,
    plate_letters: str(f, 'plate_letters'),
    plate_number: str(f, 'plate_number')?.replace(/\D/g, '') ?? null,
    model: str(f, 'model'),
    capacity: Math.max(1, Number(f.get('capacity')) || 15),
    school_id: str(f, 'school_id'),
  });
  if (error) redirect(`/admin/buses?error=${error.code === '23505' ? 'duplicate' : 'generic'}`);
  revalidatePath('/admin', 'layout');
  flash('busAdded', { n: number });
  redirect('/admin/buses?ok=1');
}

export async function updateBus(f: FormData) {
  const supabase = createClient();
  const id = String(f.get('id'));
  const driver = str(f, 'driver_id');
  const sup = str(f, 'supervisor_id');

  // One person can only be on one bus: free them from any other bus first.
  if (driver) await supabase.from('buses').update({ driver_id: null }).eq('driver_id', driver).neq('id', id);
  if (sup) await supabase.from('buses').update({ supervisor_id: null }).eq('supervisor_id', sup).neq('id', id);

  const { error } = await supabase
    .from('buses')
    .update({
      plate_letters: str(f, 'plate_letters'),
      plate_number: str(f, 'plate_number')?.replace(/\D/g, '') ?? null,
      model: str(f, 'model'),
      capacity: Math.max(1, Number(f.get('capacity')) || 15),
      school_id: str(f, 'school_id'),
      driver_id: driver,
      supervisor_id: sup,
    })
    .eq('id', id);
  if (error) redirect('/admin/buses?error=generic');
  revalidatePath('/admin', 'layout');
  flash('busSaved');
  redirect('/admin/buses?ok=1');
}

export async function deleteBus(f: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from('buses').delete().eq('id', String(f.get('id')));
  if (error) redirect('/admin/buses?error=generic');
  revalidatePath('/admin', 'layout');
  flash('busDeleted');
  redirect('/admin/buses?ok=1');
}
