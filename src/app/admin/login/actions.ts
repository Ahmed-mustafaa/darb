'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { done } from '@/lib/flash';

export async function signIn(formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  });
  if (error) {
    // Pass Supabase's own message along so problems other than a wrong password are visible.
    redirect(`/admin/login?error=1&detail=${encodeURIComponent(error.message).slice(0, 300)}`);
  }
  redirect(done('/admin', 'welcomeBack'));
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(done('/admin/login', 'signedOut'));
}
