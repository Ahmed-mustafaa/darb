import { redirect } from 'next/navigation';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { getPending } from '@/lib/session';
import { displayPhone } from '@/lib/phone';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { SubmitButton } from '@/components/parent-client';
import { resendCode, verifyCode } from '../../actions';

const ERRORS: Record<string, Key> = {
  wrong: 'p_wrongCode',
  expired: 'p_codeExpired',
  toomany: 'p_tooMany',
  wa_config: 'p_waNotConfigured',
  wa_failed: 'p_waFailed',
};

export default function Verify({ searchParams }: { searchParams: { error?: string } }) {
  const pending = getPending();
  if (!pending) redirect('/register?error=session');
  const t = getT(getLocale());
  const back = pending.mode === 'signin' ? '/signin' : '/register';
  return (
    <div className="stack">
      {pending.mode === 'register' ? <StepHead step={2} t={t} backHref={back} /> : <a className="back" href={back}>{t('back')}</a>}
      <h1>{t('p_codeTitle')}</h1>
      <p className="lead">{t('p_codeLead')} <b className="mono">{displayPhone(pending.phone)}</b></p>
      {pending.testCode && (
        <p className="testcode">{t('p_testMode')}<b>{pending.testCode}</b></p>
      )}
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <form className="stack" action={verifyCode}>
        <label className="label" htmlFor="code">{t('p_code')}</label>
        <input
          className="input otp-input"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9٠-٩]{4}"
          maxLength={4}
          required
          autoFocus
        />
        <SubmitButton className="btn btn-primary btn-block">{t('p_verify')}</SubmitButton>
      </form>
      <form action={resendCode}>
        <button className="btn btn-ghost" type="submit">{t('p_resend')}</button>
      </form>
    </div>
  );
}
