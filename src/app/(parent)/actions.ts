'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEgPhone } from '@/lib/phone';
import { quote, type PlanId } from '@/lib/pricing';
import { MIN_PASSWORD, checkPassword, hashPassword, recordAttempt, tooManyAttempts } from '@/lib/password';
import { clearParentSession, getParentSession, setParentSession, setStaffSession } from '@/lib/session';
import { isLocked, loadSettings, nextStep, requireFamily } from '@/lib/parent';

const s = (f: FormData, k: string) => String(f.get(k) ?? '');
const t = (f: FormData, k: string) => s(f, k).trim();

/** Step 1: a new family creates its account with a mobile number and a password. */
export async function registerParent(f: FormData) {
  const phone = normalizeEgPhone(t(f, 'phone'));
  const name = t(f, 'name');
  const password = s(f, 'password');
  const secondRaw = t(f, 'second_phone');
  const second = secondRaw ? normalizeEgPhone(secondRaw) : null;
  if (name.length < 3) redirect('/register?error=name');
  if (!phone) redirect('/register?error=phone');
  if (secondRaw && !second) redirect('/register?error=phone2');
  if (password.length < MIN_PASSWORD) redirect('/register?error=pwshort');
  if (password !== s(f, 'password2')) redirect('/register?error=pwmatch');

  const db = createAdminClient();
  const { data: existing } = await db.from('parents').select('id, password_hash').eq('phone', phone).maybeSingle();
  if (existing?.password_hash) redirect('/register?error=exists');

  const relation = ['mother', 'father', 'guardian'].includes(t(f, 'relation')) ? t(f, 'relation') : 'mother';
  const row = {
    full_name: name,
    phone,
    relation,
    second_name: t(f, 'second_name') || null,
    second_phone: second,
    password_hash: await hashPassword(password),
  };
  let id: string;
  if (existing) {
    // A family the office added from paper records: they claim it by choosing a password.
    await db.from('parents').update({ ...row, full_name: name }).eq('id', existing.id);
    id = existing.id;
  } else {
    const { data, error } = await db.from('parents').insert(row).select('id').single();
    if (error || !data) redirect(`/register?error=${error?.code === '23505' ? 'exists' : 'generic'}`);
    id = data.id;
  }
  setParentSession({ pid: id, phone });
  redirect('/register');
}

export async function signInParent(f: FormData) {
  const phone = normalizeEgPhone(t(f, 'phone'));
  if (!phone) redirect('/signin?error=phone');
  const db = createAdminClient();
  if (await tooManyAttempts(db, phone)) redirect('/signin?error=toomany');
  const { data: parent } = await db.from('parents').select('id, password_hash').eq('phone', phone).maybeSingle();
  if (parent && !parent.password_hash) redirect('/signin?error=nopassword');
  const ok = !!parent && (await checkPassword(s(f, 'password'), parent.password_hash));
  await recordAttempt(db, phone, ok);
  if (!ok || !parent) redirect('/signin?error=wrong');
  setParentSession({ pid: parent.id, phone });
  redirect('/register');
}

/** Drivers and supervisors sign in with the mobile number and password the office set for them. */
export async function signInStaff(f: FormData) {
  const phone = normalizeEgPhone(t(f, 'phone'));
  if (!phone) redirect('/crew/signin?error=phone');
  const db = createAdminClient();
  if (await tooManyAttempts(db, phone)) redirect('/crew/signin?error=toomany');
  const { data: staff } = await db.from('staff').select('id, password_hash, active').eq('phone', phone).maybeSingle();
  if (!staff || !staff.active) {
    await recordAttempt(db, phone, false);
    redirect('/crew/signin?error=nostaff');
  }
  if (!staff.password_hash) redirect('/crew/signin?error=nopassword');
  const ok = await checkPassword(s(f, 'password'), staff.password_hash);
  await recordAttempt(db, phone, ok);
  if (!ok) redirect('/crew/signin?error=wrong');
  setStaffSession({ sid: staff.id, phone });
  redirect('/crew');
}

export async function saveLocation(f: FormData) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  const lat = Number(f.get('lat'));
  const lng = Number(f.get('lng'));
  // Rough box around Egypt, to catch a map that never loaded
  if (!(lat > 22 && lat < 32 && lng > 24 && lng < 37)) redirect('/register/location?error=loc');
  await createAdminClient()
    .from('parents')
    .update({ home_lat: lat, home_lng: lng, address: t(f, 'address') || null, landmark: t(f, 'landmark') || null })
    .eq('id', fam.parent.id);
  redirect('/register/children');
}

export async function saveChildren(f: FormData) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  const count = Math.min(6, Math.max(1, Number(f.get('count')) || 1));
  const kids = Array.from({ length: count }, (_, i) => ({
    parent_id: fam.parent.id,
    full_name: t(f, `name_${i}`),
    school_id: t(f, `school_${i}`) || null,
    grade: t(f, `grade_${i}`) || null,
    notes: t(f, `notes_${i}`) || null,
  }));
  if (kids.some((k) => k.full_name.length < 2 || !k.school_id || !k.grade)) redirect('/register/children?error=kids');

  const db = createAdminClient();
  await db.from('children').delete().eq('parent_id', fam.parent.id);
  const { error } = await db.from('children').insert(kids);
  if (error) redirect('/register/children?error=generic');
  redirect('/register/package');
}

export async function choosePackage(f: FormData) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  if (!fam.children.length) redirect('/register/children');
  const plan = (['month', 'term', 'year'].includes(t(f, 'plan')) ? t(f, 'plan') : 'term') as PlanId;
  const { prices } = await loadSettings();
  const q = quote(prices, fam.children.length, plan, fam.parent.is_returning);
  const row = { plan, children_count: fam.children.length, amount: q.total, status: 'awaiting_payment', method: 'instapay', reject_reason: null };

  const db = createAdminClient();
  if (fam.payment && (fam.payment.status === 'awaiting_payment' || fam.payment.status === 'rejected')) {
    await db.from('payments').update(row).eq('id', fam.payment.id);
  } else {
    const { error } = await db.from('payments').insert({ ...row, parent_id: fam.parent.id });
    if (error) redirect('/register/package?error=generic');
  }
  redirect('/register/pay');
}

const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/heic': 'heic' };

export async function submitReceipt(f: FormData) {
  const fam = await requireFamily();
  const pay = fam.payment;
  if (!pay || !(pay.status === 'awaiting_payment' || pay.status === 'rejected')) redirect('/parent');
  const reference = t(f, 'reference');
  if (reference.length < 4 || reference.length > 60) redirect('/register/pay?error=ref');
  const file = f.get('screenshot');
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024 || !IMAGE_TYPES[file.type]) {
    redirect('/register/pay?error=shot');
  }

  const db = createAdminClient();
  const path = `${fam.parent.id}/${pay.id}-${Date.now()}.${IMAGE_TYPES[file.type]}`;
  const { error: upErr } = await db.storage.from('payment-proofs').upload(path, file, { contentType: file.type });
  if (upErr) redirect('/register/pay?error=upload');

  const { error } = await db
    .from('payments')
    .update({
      reference,
      payer_name: t(f, 'payer_name') || null,
      proof_path: path,
      status: 'awaiting_review',
      submitted_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq('id', pay.id);
  if (error) {
    await db.storage.from('payment-proofs').remove([path]);
    redirect(`/register/pay?error=${error.code === '23505' ? 'refused' : 'generic'}`);
  }
  redirect('/parent');
}

export async function parentSignOut() {
  clearParentSession();
  redirect('/');
}

/** Used by the start pages: an already signed-in parent continues where they left off. */
export async function continueIfSignedIn() {
  if (getParentSession()) redirect(nextStep(await requireFamily()));
}
