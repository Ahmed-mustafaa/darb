'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEgPhone } from '@/lib/phone';
import { getLocale } from '@/lib/i18n';
import { quote, type PlanId } from '@/lib/pricing';
import { sendLoginCode } from '@/lib/whatsapp';
import {
  clearParentSession,
  clearPending,
  getParentSession,
  getPending,
  hashCode,
  newCode,
  setParentSession,
  setPending,
  type Pending,
} from '@/lib/session';
import { isLocked, loadSettings, nextStep, requireFamily } from '@/lib/parent';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Creates a code, sends it and remembers the details until the code is confirmed. */
async function sendCode(pending: Pending, errorPath: string) {
  const db = createAdminClient();
  const since = new Date(Date.now() - 60 * 60e3).toISOString();
  const { count } = await db.from('otp_codes').select('id', { count: 'exact', head: true }).eq('phone', pending.phone).gte('created_at', since);
  if ((count ?? 0) >= 5) redirect(`${errorPath}?error=toomany`);

  const code = newCode();
  await db.from('otp_codes').insert({
    phone: pending.phone,
    code_hash: hashCode(pending.phone, code),
    expires_at: new Date(Date.now() + 10 * 60e3).toISOString(),
  });

  let testCode: string | undefined;
  try {
    const r = await sendLoginCode(pending.phone, code, getLocale());
    if (!r.sent) testCode = r.testCode;
  } catch (e) {
    redirect(`${errorPath}?error=${(e as Error).message === 'WHATSAPP_NOT_CONFIGURED' ? 'wa_config' : 'wa_failed'}`);
  }
  setPending({ ...pending, testCode });
  redirect('/register/verify');
}

export async function startRegister(f: FormData) {
  const phone = normalizeEgPhone(s(f, 'phone'));
  const name = s(f, 'name');
  const secondPhoneRaw = s(f, 'second_phone');
  const secondPhone = secondPhoneRaw ? normalizeEgPhone(secondPhoneRaw) : null;
  if (name.length < 3) redirect('/register?error=name');
  if (!phone) redirect('/register?error=phone');
  if (secondPhoneRaw && !secondPhone) redirect('/register?error=phone2');
  const relation = ['mother', 'father', 'guardian'].includes(s(f, 'relation')) ? s(f, 'relation') : 'mother';
  await sendCode(
    { mode: 'register', phone, name, relation, second_name: s(f, 'second_name') || undefined, second_phone: secondPhone ?? undefined },
    '/register',
  );
}

export async function startSignin(f: FormData) {
  const phone = normalizeEgPhone(s(f, 'phone'));
  if (!phone) redirect('/signin?error=phone');
  const { data } = await createAdminClient().from('parents').select('id').eq('phone', phone).maybeSingle();
  if (!data) redirect('/signin?error=noaccount');
  await sendCode({ mode: 'signin', phone }, '/signin');
}

export async function resendCode() {
  const pending = getPending();
  if (!pending) redirect('/register?error=session');
  await sendCode(pending, '/register/verify');
}

export async function verifyCode(f: FormData) {
  const pending = getPending();
  if (!pending) redirect('/register?error=session');
  const code = s(f, 'code').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
  const db = createAdminClient();

  const { data: otp } = await db
    .from('otp_codes')
    .select('id, code_hash, attempts, expires_at, used_at')
    .eq('phone', pending.phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp || otp.used_at || new Date(otp.expires_at) < new Date()) redirect('/register/verify?error=expired');
  if (otp.attempts >= 5) redirect('/register/verify?error=toomany');
  if (otp.code_hash !== hashCode(pending.phone, code)) {
    await db.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
    redirect('/register/verify?error=wrong');
  }
  await db.from('otp_codes').update({ used_at: new Date().toISOString() }).eq('id', otp.id);

  // Find or create the parent
  let { data: parent } = await db.from('parents').select('id').eq('phone', pending.phone).maybeSingle();
  if (!parent) {
    if (pending.mode === 'signin') redirect('/signin?error=noaccount');
    const { data, error } = await db
      .from('parents')
      .insert({
        full_name: pending.name,
        phone: pending.phone,
        relation: pending.relation,
        second_name: pending.second_name ?? null,
        second_phone: pending.second_phone ?? null,
      })
      .select('id')
      .single();
    if (error || !data) redirect('/register?error=generic');
    parent = data;
  } else if (pending.mode === 'register' && pending.second_phone) {
    await db.from('parents').update({ second_name: pending.second_name ?? null, second_phone: pending.second_phone }).eq('id', parent.id);
  }

  setParentSession({ pid: parent.id, phone: pending.phone });
  clearPending();
  // The start page sends a signed-in parent on to their next step (the new cookie is read on that request).
  redirect('/register');
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
    .update({ home_lat: lat, home_lng: lng, address: s(f, 'address') || null, landmark: s(f, 'landmark') || null })
    .eq('id', fam.parent.id);
  redirect('/register/children');
}

export async function saveChildren(f: FormData) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  const count = Math.min(6, Math.max(1, Number(f.get('count')) || 1));
  const kids = Array.from({ length: count }, (_, i) => ({
    parent_id: fam.parent.id,
    full_name: s(f, `name_${i}`),
    school_id: s(f, `school_${i}`) || null,
    grade: s(f, `grade_${i}`) || null,
    notes: s(f, `notes_${i}`) || null,
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
  const plan = (['month', 'term', 'year'].includes(s(f, 'plan')) ? s(f, 'plan') : 'term') as PlanId;
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
  const reference = s(f, 'reference');
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
      payer_name: s(f, 'payer_name') || null,
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
