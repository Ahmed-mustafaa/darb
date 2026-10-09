'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCrew } from '@/lib/crew';
import { clearStaffSession } from '@/lib/session';
import { endTrip, markChild, startTrip } from '@/lib/trips';

export async function crewStartTrip(f: FormData) {
  const { db, staff, bus } = await requireCrew();
  if (!bus) redirect('/crew');
  const kind = f.get('kind') === 'afternoon' ? 'afternoon' : 'morning';
  await startTrip(db, bus.id, kind, staff.id);
  revalidatePath('/crew');
  redirect('/crew');
}

export async function crewEndTrip() {
  const { db, trip } = await requireCrew();
  if (trip) await endTrip(db, trip.id);
  revalidatePath('/crew');
  redirect('/crew');
}

const STATUSES = ['waiting', 'picked_up', 'absent', 'dropped_off'] as const;

export async function crewMarkChild(f: FormData) {
  const { db, trip } = await requireCrew();
  const status = String(f.get('status'));
  if (trip && (STATUSES as readonly string[]).includes(status)) {
    await markChild(db, trip.id, String(f.get('child_id')), status as (typeof STATUSES)[number]);
  }
  revalidatePath('/crew');
  redirect('/crew');
}

export async function crewSignOut() {
  clearStaffSession();
  redirect('/crew/signin');
}
