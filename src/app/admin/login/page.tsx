import { getLocale, getT } from '@/lib/i18n';
import { BrandMark, LangSwitch, Notice } from '@/components/ui';
import { signIn } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; detail?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  return (
    <main className="center">
      <form className="auth" action={signIn}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="brand"><BrandMark />{t('brand')}</span>
          <LangSwitch locale={locale} next="/admin/login" />
        </div>
        <h1>{t('loginTitle')}</h1>
        <Notice error={searchParams.error ? t('loginError') : undefined} />
        {searchParams.detail && (
          <p className="small muted mono" style={{ direction: 'ltr', overflowWrap: 'anywhere' }}>{searchParams.detail}</p>
        )}
        <div className="field">
          <label htmlFor="email">{t('email')}</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
        </div>
        <div className="field">
          <label htmlFor="password">{t('password')}</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
        </div>
        <button className="btn btn-primary" type="submit">{t('signIn')}</button>
      </form>
    </main>
  );
}
