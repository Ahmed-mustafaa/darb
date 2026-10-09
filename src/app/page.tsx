import Link from 'next/link';
import { getLocale, getT } from '@/lib/i18n';
import { BrandMark, LangSwitch } from '@/components/ui';

export default function Home() {
  const locale = getLocale();
  const t = getT(locale);
  return (
    <main className="center">
      <div className="auth">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="brand"><BrandMark />{t('brand')}</span>
          <LangSwitch locale={locale} next="/" />
        </div>
        <h1>{t('tagline')}</h1>
        <p className="lead">{t('p_startLead')}</p>
        <Link className="btn btn-primary btn-block" href="/register">{t('landingParents')}</Link>
        <Link className="btn btn-block" href="/signin">{t('landingSignin')}</Link>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost small" href="/crew">{t('landingCrew')}</Link>
          <Link className="btn btn-ghost small" href="/admin">{t('landingAdmin')}</Link>
        </div>
      </div>
    </main>
  );
}
