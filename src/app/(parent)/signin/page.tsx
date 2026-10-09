import Link from 'next/link';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { Notice } from '@/components/ui';
import { SubmitButton } from '@/components/parent-client';
import { continueIfSignedIn, startSignin } from '../actions';

const ERRORS: Record<string, Key> = {
  phone: 'invalidPhone',
  noaccount: 'p_noAccount',
  toomany: 'p_tooMany',
  wa_config: 'p_waNotConfigured',
  wa_failed: 'p_waFailed',
};

export default async function SignIn({ searchParams }: { searchParams: { error?: string } }) {
  if (!searchParams.error) await continueIfSignedIn();
  const t = getT(getLocale());
  return (
    <form className="stack" action={startSignin}>
      <h1>{t('p_signinTitle')}</h1>
      <p className="lead">{t('p_signinLead')}</p>
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="field">
        <label htmlFor="phone">{t('p_whatsapp')}</label>
        <input className="input mono" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" required />
      </div>
      <SubmitButton className="btn btn-primary btn-block">{t('p_sendCode')}</SubmitButton>
      <Link href="/register" className="btn btn-ghost">{t('p_registerLink')}</Link>
    </form>
  );
}
