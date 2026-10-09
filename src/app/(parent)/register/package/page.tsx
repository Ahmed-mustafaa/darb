import { redirect } from 'next/navigation';
import { getLocale, getT, type Key } from '@/lib/i18n';
import { canRenew, isLocked, loadSettings, requireFamily } from '@/lib/parent';
import { egp, quote, recommendPlan, type PlanId } from '@/lib/pricing';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { SubmitButton } from '@/components/parent-client';
import { choosePackage } from '../../actions';

export default async function Package({ searchParams }: { searchParams: { error?: string } }) {
  const fam = await requireFamily();
  if (isLocked(fam) && !canRenew(fam)) redirect('/parent');
  if (!fam.children.length) redirect('/register/children');
  const locale = getLocale();
  const t = getT(locale);
  const { prices } = await loadSettings();
  const n = fam.children.length;
  const returning = fam.parent.is_returning;
  const rec = recommendPlan(n, returning);
  const selected: PlanId = fam.payment?.plan ?? rec;
  const renewing = canRenew(fam);
  const plans: { id: PlanId; label: Key }[] = [
    { id: 'month', label: 'plan_month' },
    { id: 'term', label: 'plan_term' },
    { id: 'year', label: 'plan_year' },
  ];

  return (
    <form className="stack" action={choosePackage}>
      {renewing ? <a className="back" href="/parent">{t('back')}</a> : <StepHead step={4} t={t} backHref="/register/children" />}
      <h1>{t('p_pkgTitle')}</h1>
      <p className="lead">{t('p_forKids')} {n} {t('p_kidsWord')}</p>
      <Notice error={searchParams.error ? t('errorGeneric') : undefined} />
      {plans.map((p) => {
        const q = quote(prices, n, p.id, returning);
        return (
          <label key={p.id} className="plan">
            <input type="radio" name="plan" value={p.id} defaultChecked={p.id === selected} />
            {p.id === rec && <span className="rec">{t('p_recommended')}</span>}
            <span className="pn">{t(p.label)}</span>
            <span className="pp">
              {egp(q.total, locale)}
              {q.months > 1 && <small> · {egp(q.total / q.months, locale)} {t('p_perMonth')}</small>}
            </span>
            {q.siblingSaving > 0 && <span className="small muted">{t('p_siblingLine')}: − {egp(q.siblingSaving, locale)}</span>}
            {q.returningSaving > 0 && <span className="small muted">{t('p_returningLine')}: − {egp(q.returningSaving, locale)}</span>}
            {q.saving > 0 && <span className="save">{t('p_youSave')} {egp(q.saving, locale)}</span>}
          </label>
        );
      })}
      <SubmitButton className="btn btn-primary btn-block">{t('p_toPayment')}</SubmitButton>
    </form>
  );
}
