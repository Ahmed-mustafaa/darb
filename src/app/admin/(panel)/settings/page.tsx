import { getLocale, getT, schoolName, type Key } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { egp, quote, type PlanId, type Settings } from '@/lib/pricing';
import { Notice } from '@/components/ui';
import { ConfirmButton } from '@/components/client';
import type { School } from '@/lib/data';
import { addSchool, deleteSchool, savePrices } from './actions';

const ERRORS: Record<string, Key> = { name: 'nameRequired', coords: 'badCoordinates', inuse: 'inUse', generic: 'errorGeneric' };
const DEFAULTS: Settings = { monthly_price: 1500, sibling_discount: 15, returning_discount: 5, term_months: 4, term_discount: 5, year_months: 9, year_discount: 10 };

export default async function SettingsPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  const supabase = createClient();
  const [{ data: s }, { data: schoolRows }] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('schools').select('*').order('name_en'),
  ]);
  const settings: Settings = { ...DEFAULTS, ...(s ?? {}) };
  const schools = (schoolRows ?? []) as School[];
  const plans: { id: PlanId; label: Key }[] = [
    { id: 'month', label: 'plan_month' },
    { id: 'term', label: 'plan_term' },
    { id: 'year', label: 'plan_year' },
  ];
  const num = (name: keyof Settings, label: Key, step = 1) => (
    <div className="field">
      <label htmlFor={name}>{t(label)}</label>
      <input className="input num" id={name} name={name} type="number" min={0} step={step} defaultValue={Number(settings[name])} />
    </div>
  );

  return (
    <>
      <div className="page-head"><h1>{t('nav_settings')}</h1></div>
      <Notice ok={searchParams.ok ? t('saved') : undefined} error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="two">
        <form className="panel" action={savePrices}>
          <div className="panel-h"><h2>{t('prices')}</h2></div>
          <div className="panel-b">
            {num('monthly_price', 'monthlyPrice', 50)}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {num('sibling_discount', 'siblingDiscount')}
              {num('returning_discount', 'returningDiscount')}
              {num('term_months', 'termMonths')}
              {num('term_discount', 'termDiscount')}
              {num('year_months', 'yearMonths')}
              {num('year_discount', 'yearDiscount')}
            </div>
            <button className="btn btn-teal" type="submit">{t('save')}</button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-h"><h2>{t('pricePreview')}</h2></div>
          <div className="tablewrap">
            <table>
              <thead><tr><th /><th>{t('oneChild')}</th><th>{t('twoChildren')}</th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{t(p.label)}</strong></td>
                    <td className="num">{egp(quote(settings, 1, p.id, false).total, locale)}</td>
                    <td className="num">{egp(quote(settings, 2, p.id, false).total, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-h"><h2>{t('schools')}</h2></div>
        <div className="tablewrap">
          <table>
            <tbody>
              {schools.map((sc) => (
                <tr key={sc.id}>
                  <td><strong>{schoolName(sc, locale)}</strong><span className="sub">{schoolName(sc, locale === 'ar' ? 'en' : 'ar')}</span></td>
                  <td className="mono small muted">{sc.lat != null ? `${sc.lat}, ${sc.lng}` : '—'}</td>
                  <td style={{ textAlign: 'end' }}>
                    <form action={deleteSchool}>
                      <input type="hidden" name="id" value={sc.id} />
                      <ConfirmButton className="btn btn-sm btn-ghost btn-danger" message={t('confirmDelete')}>{t('delete')}</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={addSchool} className="panel-b form-grid" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="field"><label htmlFor="sc-ar">{t('nameAr')}</label><input className="input" id="sc-ar" name="name_ar" dir="rtl" required /></div>
          <div className="field"><label htmlFor="sc-en">{t('nameEn')}</label><input className="input" id="sc-en" name="name_en" dir="ltr" required /></div>
          <div className="field"><label htmlFor="sc-loc">{t('coordinates')}</label><input className="input mono" id="sc-loc" name="location" placeholder="30.0284, 31.2010" /></div>
          <button className="btn btn-primary" type="submit">{t('addSchool')}</button>
        </form>
      </section>
    </>
  );
}
