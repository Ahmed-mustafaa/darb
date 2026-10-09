import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocale, getT } from '@/lib/i18n';
import { BrandMark, LangSwitch } from '@/components/ui';
import { NavLinks } from '@/components/client';
import { signOut } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const t = getT(locale);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();

  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link className="brand" href="/admin"><BrandMark />{t('brand')}</Link>
          {admin && (
            <NavLinks
              links={[
                { href: '/admin', label: t('nav_overview') },
                { href: '/admin/live', label: t('nav_live') },
                { href: '/admin/buses', label: t('nav_buses') },
                { href: '/admin/children', label: t('nav_children') },
                { href: '/admin/families', label: t('nav_families') },
                { href: '/admin/staff', label: t('nav_staff') },
                { href: '/admin/payments', label: t('nav_payments') },
                { href: '/admin/settings', label: t('nav_settings') },
              ]}
            />
          )}
          <div className="top-end">
            <LangSwitch locale={locale} next="/admin" />
            <form action={signOut}>
              <button className="btn btn-sm btn-ghost" type="submit">{t('signOut')}</button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap">
        {admin ? (
          children
        ) : (
          <div className="panel panel-b">
            <h1 style={{ fontSize: 22 }}>{t('notAdmin')}</h1>
            <p className="muted">{t('notAdminHelp')}</p>
            <p className="mono small">{user.email}</p>
          </div>
        )}
      </main>
    </>
  );
}
