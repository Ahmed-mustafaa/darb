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
        <div className="panel panel-b">
          <strong>{t('landingParents')}</strong>
          <p className="muted">{t('landingParentsSoon')}</p>
        </div>
        <Link className="btn btn-primary" href="/admin">{t('landingAdmin')}</Link>
      </div>
    </main>
  );
}
