import { redirect } from 'next/navigation';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { loadSettings, requireFamily } from '@/lib/parent';
import { egp } from '@/lib/pricing';
import { displayPhone } from '@/lib/phone';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { CopyButton, SubmitButton } from '@/components/parent-client';
import { submitReceipt } from '../../actions';

const ERRORS: Record<string, Key> = {
  ref: 'p_refRequired',
  shot: 'p_shotRequired',
  upload: 'uploadFailed',
  refused: 'duplicateReference',
  generic: 'errorGeneric',
};

export default async function Pay({ searchParams }: { searchParams: { error?: string } }) {
  const fam = await requireFamily();
  const pay = fam.payment;
  if (!pay) redirect('/register/package');
  if (!(pay.status === 'awaiting_payment' || pay.status === 'rejected')) redirect('/parent');
  const locale = getLocale();
  const t = getT(locale);
  const { instapay: ip } = await loadSettings();
  const addonNames = pay.kind === 'addon' ? fam.children.filter((c) => pay.child_ids?.includes(c.id)).map((c) => c.full_name) : [];
  const ready = !!(ip.qrUrl || ip.link || ip.address);
  const copy = { label: t('p_copy'), done: t('p_copied') };
  const amountText = String(Math.round(pay.amount));

  return (
    <div className="stack">
      {pay.kind === 'addon' ? <a className="back" href="/parent">{t('back')}</a> : <StepHead step={5} t={t} backHref="/register/package" />}
      <h1>{t('p_payTitle')}</h1>
      {pay.kind === 'addon' && addonNames.length > 0 && <p className="lead">{t('a_payFor')}: <strong>{addonNames.join('، ')}</strong></p>}
      <Notice error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      {pay.status === 'rejected' && pay.reject_reason && (
        <p className="notice bad">{t('p_statusRejected')}: {t(`reason_${pay.reject_reason}` as Key)}</p>
      )}

      <section className="paybox">
        <div className="copyrow">
          <div>
            <span className="label">{t('p_amountToPay')}</span>
            <div className="bigamount">{egp(pay.amount, locale)}</div>
          </div>
          <CopyButton text={amountText} {...copy} />
        </div>
        <div className="copyrow">
          <div>
            <span className="label">{t('p_payCode')}</span>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{pay.code}</div>
            <span className="help">{t('p_payCodeHelp')}</span>
          </div>
          <CopyButton text={pay.code} {...copy} />
        </div>
      </section>

      {!ready ? (
        <p className="notice bad">{t('p_notReady')}</p>
      ) : (
        <>
          <section className="paybox">
            <h2 style={{ fontSize: 17 }}>{t('p_step1')}</h2>
            {ip.link && (
              <a className="btn btn-teal btn-block" href={ip.link} target="_blank" rel="noreferrer">{t('p_openInstapay')}</a>
            )}
            {ip.qrUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr" src={ip.qrUrl} alt="InstaPay QR" />
                <p className="small muted" style={{ textAlign: 'center' }}>{t('p_scanQr')}</p>
              </>
            )}
            {(ip.address || ip.mobile) && (
              <div className="lines">
                <span className="label">{t('p_sendTo')}</span>
                {ip.address && (
                  <div className="copyrow"><span className="mono">{ip.address}</span><CopyButton text={ip.address} {...copy} /></div>
                )}
                {ip.mobile && (
                  <div className="copyrow"><span className="mono">{displayPhone(ip.mobile) || ip.mobile}</span><CopyButton text={ip.mobile} {...copy} /></div>
                )}
                {ip.name && <div><span className="muted">{t('p_accountName')}</span><span>{ip.name}</span></div>}
              </div>
            )}
          </section>

          <form className="paybox" action={submitReceipt}>
            <h2 style={{ fontSize: 17 }}>{t('p_step2')}</h2>
            <div className="field">
              <label htmlFor="reference">{t('reference')}</label>
              <input className="input mono" id="reference" name="reference" required minLength={4} maxLength={60} dir="ltr" autoComplete="off" />
              <span className="help">{t('p_referenceHelp')}</span>
            </div>
            <div className="field">
              <label htmlFor="payer_name">{t('payerName')}</label>
              <input className="input" id="payer_name" name="payer_name" defaultValue={fam.parent.full_name} />
            </div>
            <div className="field">
              <label htmlFor="screenshot">{t('screenshot')}</label>
              <input className="input" id="screenshot" name="screenshot" type="file" accept="image/png,image/jpeg,image/webp,image/heic" required />
              <span className="help">{t('p_screenshotHelp')}</span>
            </div>
            <SubmitButton className="btn btn-primary btn-block">{t('p_send')}</SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
