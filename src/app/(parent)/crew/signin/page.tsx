import { redirect } from 'next/navigation';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { getStaffSession } from '@/lib/session';
import { Notice } from '@/components/ui';
import { SubmitButton } from '@/components/parent-client';
import { signInStaff } from '../../actions';

const ERRORS: Record<string, Key> = {
  phone: 'invalidPhone',
  nostaff: 'c_noStaff',
  nopassword: 'c_noPassword',
  wrong: 'p_wrongPw',
  toomany: 'p_tooMany',
};

export default function CrewSignin({ searchParams }: { searchParams: { error?: string } }) {
  if (!searchParams.error && getStaffSession()) redirect('/crew');
  const t = getT(getLocale());
  return (
    <form className="stack" action={signInStaff}>
      <h1>{t('c_signinTitle')}</h1>
      <p className="lead">{t('c_signinLead')}</p>
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="field">
        <label htmlFor="phone">{t('phone')}</label>
        <input className="input mono" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" required />
      </div>
      <div className="field">
        <label htmlFor="password">{t('password')}</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      <SubmitButton className="btn btn-primary btn-block">{t('signIn')}</SubmitButton>
    </form>
  );
}
