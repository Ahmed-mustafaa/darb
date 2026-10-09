import Link from 'next/link';
import { headers } from 'next/headers';
import { getLocale } from '@/lib/i18n';
import { BrandMark, LangSwitch } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const path = headers().get('x-pathname') ?? '/register';
  return (
    <>
      <header className="top">
        <div className="top-in pwrap-head">
          <Link className="brand" href="/"><BrandMark />{locale === 'ar' ? 'درب' : 'Darb'}</Link>
          <div className="top-end"><LangSwitch locale={locale} next={path} /></div>
        </div>
      </header>
      <main className="pwrap">{children}</main>
    </>
  );
}
