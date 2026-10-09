import Link from 'next/link';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { SubmitButton } from '@/components/parent-client';
import { continueIfSignedIn, registerParent } from '../actions';

const ERRORS: Record<string, Key> = {
  name: 'nameRequired',
  phone: 'invalidPhone',
  phone2: 'invalidPhone',
  pwshort: 'p_pwShort',
  pwmatch: 'p_pwMatch',
  exists: 'p_exists',
  session: 'p_startOver',
  generic: 'errorGeneric',
};

export default async function RegisterStart({ searchParams }: { searchParams: { error?: string } }) {
  if (!searchParams.error) await continueIfSignedIn();
  const t = getT(getLocale());
  return (
    <form className="stack" action={registerParent}>
      <StepHead step={1} t={t} />
      <h1>{t('p_startTitle')}</h1>
      <p className="lead">{t('p_startLead')}</p>
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      {searchParams.error === 'exists' && <Link className="btn" href="/signin">{t('p_signinTitle')}</Link>}
      <div className="field">
        <label htmlFor="name">{t('p_yourName')}</label>
        <input className="input" id="name" name="name" autoComplete="name" required minLength={3} />
      </div>
      <div className="field">
        <label htmlFor="phone">{t('p_mobile')}</label>
        <input className="input mono" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" required />
      </div>
      <div className="field">
        <label htmlFor="password">{t('p_password')}</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={6} required dir="ltr" />
        <span className="help">{t('p_pwHelp')}</span>
      </div>
      <div className="field">
        <label htmlFor="password2">{t('p_password2')}</label>
        <input className="input" id="password2" name="password2" type="password" autoComplete="new-password" minLength={6} required dir="ltr" />
      </div>
      <div className="field">
        <span className="label">{t('p_relation')}</span>
        <div className="seg" role="radiogroup">
          {(['mother', 'father', 'guardian'] as const).map((r, i) => (
            <label key={r}>
              <input type="radio" name="relation" value={r} defaultChecked={i === 0} />
              {t(`rel_${r}`)}
            </label>
          ))}
        </div>
      </div>
      <details className="panel panel-b">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('p_secondParent')}</summary>
        <input className="input" name="second_name" placeholder={t('fullName')} aria-label={t('fullName')} />
        <input className="input mono" name="second_phone" inputMode="tel" placeholder="010 1234 5678" aria-label={t('p_mobile')} />
      </details>
      <SubmitButton className="btn btn-primary btn-block">{t('p_createAccount')}</SubmitButton>
      <Link href="/signin" className="btn btn-ghost">{t('landingSignin')}</Link>
    </form>
  );
}
