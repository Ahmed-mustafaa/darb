import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GRADES, getLocale, getT, gradeLabel, schoolName } from '@/lib/i18n';
import { loadSettings, requireFamily } from '@/lib/parent';
import { createAdminClient } from '@/lib/supabase/admin';
import { addonQuote, egp } from '@/lib/pricing';
import { formatDate } from '@/lib/subscription';
import { Notice } from '@/components/ui';
import { ChildrenFields, SubmitButton } from '@/components/parent-client';
import { addChildMidterm } from '../../actions';

/** A family with a running subscription adds a child, paying until the current end date. */
export default async function AddChild({ searchParams }: { searchParams: { error?: string } }) {
  const fam = await requireFamily();
  const locale = getLocale();
  const t = getT(locale);
  const active = fam.active;
  // No running subscription: children are edited in the normal registration steps
  if (!active || active.expired) redirect('/register/children');
  if (fam.payment && fam.payment.id !== active.id && fam.payment.status === 'awaiting_review') {
    return (
      <div className="stack">
        <Link className="back" href="/parent">{t('back')}</Link>
        <p className="notice bad">{t('a_reviewFirst')}</p>
      </div>
    );
  }
  const [{ prices }, { data: schools }] = await Promise.all([
    loadSettings(),
    createAdminClient().from('schools').select('id, name_ar, name_en').order('name_en'),
  ]);
  const one = addonQuote(prices, 1, active.daysLeft);

  return (
    <form className="stack" action={addChildMidterm}>
      <Link className="back" href="/parent">{t('back')}</Link>
      <h1>{t('a_title')}</h1>
      <p className="lead">{t('a_lead')} <strong>{formatDate(active.valid_until, locale)}</strong>.</p>
      <Notice error={searchParams.error === 'kids' ? t('p_kidsRequired') : searchParams.error ? t('errorGeneric') : undefined} />
      <ChildrenFields
        initial={[]}
        max={4}
        schools={(schools ?? []).map((s) => ({ id: s.id, name: schoolName(s, locale) }))}
        grades={GRADES.map((g) => ({ value: g, label: gradeLabel(g, locale) }))}
        labels={{ child: t('p_child'), name: t('p_firstName'), school: t('school'), grade: t('grade'), notesPh: t('p_notesPh'), addAnother: t('p_addAnother'), remove: t('p_remove') }}
      />
      <section className="paybox">
        <span className="label">{t('a_price')}</span>
        <div className="bigamount">{egp(one.total, locale)} <small className="small muted" style={{ fontSize: 14 }}>/ {t('p_child')}</small></div>
        <span className="small muted">
          {one.months} {t('a_months')} × {egp(prices.monthly_price, locale)} − {t('p_siblingLine')} {prices.sibling_discount}%
        </span>
      </section>
      <SubmitButton className="btn btn-primary btn-block">{t('a_continue')}</SubmitButton>
    </form>
  );
}
