import { redirect } from 'next/navigation';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { getStaffSession } from '@/lib/session';
import { Notice } from '@/components/ui';
import { SubmitButton } from '@/components/parent-client';
import { startStaffSignin } from '../../actions';

const ERRORS: Record<string, Key> = {
  phone: 'invalidPhone',
  nostaff: 'c_noStaff',
  toomany: 'p_tooMany',
  wa_config: 'p_waNotConfigured',
  wa_failed: 'p_waFailed',
};

export default function CrewSignin({ searchParams }: { searchParams: { error?: string } }) {
  if (!searchParams.error && getStaffSession()) redirect('/crew');
  const t = getT(getLocale());
  return (
    <form className="stack" action={startStaffSignin}>
      <h1>{t('c_signinTitle')}</h1>
      <p className="lead">{t('c_signinLead')}</p>
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="field">
        <label htmlFor="phone">{t('phone')}</label>
        <input className="input mono" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" required />
      </div>
      <SubmitButton className="btn btn-primary btn-block">{t('p_sendCode')}</SubmitButton>
    </form>
  );
}
