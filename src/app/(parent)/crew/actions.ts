'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCrew } from '@/lib/crew';
import { clearStaffSession } from '@/lib/session';
import { endTrip, markChild, startTrip } from '@/lib/trips';
import { flash } from '@/lib/flash';

export async function crewStartTrip(f: FormData) {
  const { db, staff, bus } = await requireCrew();
  if (!bus) redirect('/crew');
  const kind = f.get('kind') === 'afternoon' ? 'afternoon' : 'morning';
  await startTrip(db, bus.id, kind, staff.id);
  revalidatePath('/crew');
  flash('tripStarted');
  redirect('/crew');
}

export async function crewEndTrip() {
  const { db, trip } = await requireCrew();
  if (trip) await endTrip(db, trip.id);
  revalidatePath('/crew');
  if (trip) flash('tripEnded');
  redirect('/crew');
}

const STATUSES = ['waiting', 'picked_up', 'absent', 'dropped_off'] as const;

export async function crewMarkChild(f: FormData) {
  const { db, trip } = await requireCrew();
  const status = String(f.get('status'));
  if (trip && (STATUSES as readonly string[]).includes(status)) {
    await markChild(db, trip.id, String(f.get('child_id')), status as (typeof STATUSES)[number]);
    const { data: kid } = await db.from('children').select('full_name').eq('id', String(f.get('child_id'))).maybeSingle();
    const name = kid?.full_name?.split(' ')[0] ?? '';
    const prev = String(f.get('prev') ?? '');
    flash(
      status === 'absent' ? 'markedAbsent' : status === 'dropped_off' ? 'markedDropped' : status === 'picked_up' && prev !== 'dropped_off' ? 'markedPicked' : 'markedUndo',
      { name },
    );
  }
  revalidatePath('/crew');
  redirect('/crew');
}

export async function crewSignOut() {
  clearStaffSession();
  flash('signedOut');
  redirect('/crew/signin');
}
