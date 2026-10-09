import type { Key } from '@/lib/i18n';

export function StepHead({ step, t, backHref }: { step: number; t: (k: Key) => string; backHref?: string }) {
  return (
    <div className="stephead">
      {backHref ? <a className="back" href={backHref}>{t('back')}</a> : <span />}
      <div className="prog">
        <span className="num">{t('stepOf')} {step} {t('of')} 5</span>
        <span className="bar"><i style={{ width: `${(step / 5) * 100}%` }} /></span>
      </div>
    </div>
  );
}
