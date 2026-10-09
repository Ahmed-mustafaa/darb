'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MIN_PASSWORD, hashPassword } from '@/lib/password';
import { done } from '@/lib/flash';

/** The office sets a new password for a parent who forgot theirs. */
export async function setParentPassword(f: FormData) {
  const supabase = createClient();
  const password = String(f.get('password') ?? '');
  if (password.length < MIN_PASSWORD) redirect('/admin/families?error=pwshort');
  const { error } = await supabase.from('parents').update({ password_hash: await hashPassword(password) }).eq('id', String(f.get('id')));
  if (error) redirect('/admin/families?error=generic');
  revalidatePath('/admin/families');
  redirect(done('/admin/families?ok=1', 'passwordSet'));
}
