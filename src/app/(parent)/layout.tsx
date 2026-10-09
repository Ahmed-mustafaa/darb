import Link from 'next/link';
import { headers } from 'next/headers';
import { getLocale, getT } from '@/lib/i18n';
import { getParentSession, getStaffSession } from '@/lib/session';
import { BrandMark, LangSwitch } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const path = headers().get('x-pathname') ?? '/register';
  const t = getT(locale);
  const isCrewPage = path.startsWith('/crew');
  // Signed-in parents always have a way back to their home page
  const home = isCrewPage ? (getStaffSession() ? '/crew' : null) : getParentSession() ? '/parent' : null;
  return (
    <>
      <header className="top">
        <div className="top-in pwrap-head">
          <Link className="brand" href={home ?? '/'}><BrandMark />{locale === 'ar' ? 'درب' : 'Darb'}</Link>
          <div className="top-end">
            {home && <Link className="btn btn-sm" href={home}>{t('h_home')}</Link>}
            <LangSwitch locale={locale} next={path} />
          </div>
        </div>
      </header>
      <main className="pwrap">{children}</main>
    </>
  );
}
