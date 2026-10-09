import { getLocale, getT } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { displayPhone } from '@/lib/phone';
import { Notice } from '@/components/ui';
import { setParentPassword } from './actions';
import { DemoPushButton } from '@/components/demo-push-client';

export default async function FamiliesPage({ searchParams }: { searchParams: { ok?: string; error?: string; q?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  const supabase = createClient();
  const [{ data: parents }, { data: kids }, { data: pays }, { data: subs }] = await Promise.all([
    supabase.from('parents').select('id, full_name, phone, second_phone, password_hash, created_at').order('created_at', { ascending: false }),
    supabase.from('children').select('parent_id, full_name'),
    supabase.from('payments').select('parent_id, status'),
    supabase.from('push_subscriptions').select('parent_id'),
  ]);
  const q = (searchParams.q ?? '').toLowerCase();
  const list = (parents ?? []).filter((p) => !q || (p.full_name + ' ' + p.phone).toLowerCase().includes(q));

  return (
    <>
      <div className="page-head"><h1>{t('nav_families')}</h1></div>
      <p className="small muted">{t('familiesHelp')}</p>
      <Notice
        ok={searchParams.ok ? t('saved') : undefined}
        error={searchParams.error === 'pwshort' ? t('p_pwShort') : searchParams.error ? t('errorGeneric') : undefined}
      />
      <section className="panel">
        <div className="toolbar">
          <form method="get"><input className="input" type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder={t('search')} aria-label={t('search')} style={{ maxWidth: 260 }} /></form>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>{t('parent')}</th><th>{t('children')}</th><th>{t('status')}</th><th>{t('password')}</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="muted">{t('noResults')}</td></tr>}
              {list.map((p) => {
                const theirKids = (kids ?? []).filter((k) => k.parent_id === p.id);
                const paid = (pays ?? []).some((x) => x.parent_id === p.id && x.status === 'paid');
                const notif = (subs ?? []).some((x) => x.parent_id === p.id);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.full_name}</strong><span className="sub mono">{displayPhone(p.phone)}</span></td>
                    <td>{theirKids.map((k) => k.full_name).join('، ') || '—'}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={paid ? 'chip ok' : 'chip'}>{paid ? t('p_paid') : t('p_notPaid')}</span>
                      {notif && <span className="chip teal">{t('notifOn')}</span>}
                      {notif && <DemoPushButton parentId={p.id} labels={{ button: t('demoPush'), sent: t('demoPushSent'), failed: t('demoPushFailed') }} />}
                    </td>
                    <td>
                      <form action={setParentPassword} className="inline-form">
                        <input type="hidden" name="id" value={p.id} />
                        <input className="input input-sm" name="password" type="text" minLength={6} required placeholder={p.password_hash ? '••••••' : t('newPassword')} aria-label={t('newPassword')} style={{ width: 120 }} dir="ltr" autoComplete="off" />
                        <button className="btn btn-sm" type="submit">{t('save')}</button>
                      </form>
                      {!p.password_hash && <span className="sub" style={{ color: 'var(--warn)' }}>{t('noPasswordYet')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
