import Link from 'next/link';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { Notice } from '@/components/ui';
import { SubmitButton } from '@/components/parent-client';
import { continueIfSignedIn, signInParent } from '../actions';

const ERRORS: Record<string, Key> = {
  phone: 'invalidPhone',
  wrong: 'p_wrongPw',
  nopassword: 'p_noPassword',
  toomany: 'p_tooMany',
};

export default async function SignIn({ searchParams }: { searchParams: { error?: string } }) {
  if (!searchParams.error) await continueIfSignedIn();
  const t = getT(getLocale());
  return (
    <form className="stack" action={signInParent}>
      <h1>{t('p_signinTitle')}</h1>
      <p className="lead">{t('p_signinLead')}</p>
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="field">
        <label htmlFor="phone">{t('p_mobile')}</label>
        <input className="input mono" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" required />
      </div>
      <div className="field">
        <label htmlFor="password">{t('password')}</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      <SubmitButton className="btn btn-primary btn-block">{t('signIn')}</SubmitButton>
      <p className="help">{t('p_forgot')}</p>
      <Link href="/register" className="btn btn-ghost">{t('p_registerLink')}</Link>
    </form>
  );
}
