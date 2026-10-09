import { getLocale, getT, type Key } from '@/lib/i18n';
import { loadAll, type Staff } from '@/lib/data';
import { displayPhone } from '@/lib/phone';
import { Notice } from '@/components/ui';
import { AutoSubmitSelect } from '@/components/client';
import { addStaff, assignStaff, toggleActive } from './actions';

const ERRORS: Record<string, Key> = { name: 'nameRequired', phone: 'invalidPhone', duplicate: 'duplicatePhone', generic: 'errorGeneric' };

export default async function StaffPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  const { staff, buses } = await loadAll();

  const table = (role: 'driver' | 'supervisor', list: Staff[]) => (
    <section className="panel">
      <div className="panel-h">
        <h2>{role === 'driver' ? t('drivers') : t('supervisors')}</h2>
        <span className="small muted num">{list.filter((p) => p.active).length}</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>{t('fullName')}</th><th>{t('phone')}</th><th>{t('assignedTo')}</th><th /></tr></thead>
          <tbody>
            {list.map((p) => {
              const bus = buses.find((b) => (role === 'driver' ? b.driver_id : b.supervisor_id) === p.id);
              return (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <strong>{p.full_name}</strong>
                    {role === 'driver' && p.license_expiry && <span className="sub">{t('licenseExpiry')}: <span className="mono">{p.license_expiry}</span></span>}
                  </td>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{displayPhone(p.phone)}</td>
                  <td>
                    {p.active ? (
                      <form action={assignStaff}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="role" value={role} />
                        <AutoSubmitSelect className="input input-sm" name="bus_id" defaultValue={bus?.id ?? ''} aria-label={t('assignedTo')}>
                          <option value="">{t('notAssigned')}</option>
                          {buses.map((b) => <option key={b.id} value={b.id}>{t('bus')} {b.number}</option>)}
                        </AutoSubmitSelect>
                      </form>
                    ) : '—'}
                  </td>
                  <td>
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? 'false' : 'true'} />
                      <button className="btn btn-sm btn-ghost" type="submit">
                        {p.active ? (locale === 'ar' ? 'إيقاف' : 'Deactivate') : (locale === 'ar' ? 'تفعيل' : 'Reactivate')}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <div className="page-head"><h1>{t('nav_staff')}</h1></div>
      <Notice ok={searchParams.ok ? t('saved') : undefined} error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined} />
      <div className="two">
        {table('driver', staff.filter((s) => s.role === 'driver'))}
        {table('supervisor', staff.filter((s) => s.role === 'supervisor'))}
      </div>
      <form className="panel" action={addStaff}>
        <div className="panel-h"><h2>{t('addPerson')}</h2></div>
        <div className="panel-b form-grid">
          <div className="field">
            <label htmlFor="ns-role">{t('role')}</label>
            <select className="input" id="ns-role" name="role">
              <option value="driver">{t('role_driver')}</option>
              <option value="supervisor">{t('role_supervisor')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ns-name">{t('fullName')}</label>
            <input className="input" id="ns-name" name="full_name" required minLength={3} />
          </div>
          <div className="field">
            <label htmlFor="ns-phone">{t('phone')}</label>
            <input className="input mono" id="ns-phone" name="phone" inputMode="tel" placeholder="010 1234 5678" required />
          </div>
          <div className="field">
            <label htmlFor="ns-exp">{t('licenseExpiry')}</label>
            <input className="input" id="ns-exp" name="license_expiry" type="date" />
          </div>
          <div className="field">
            <label htmlFor="ns-bus">{t('assignedTo')}</label>
            <select className="input" id="ns-bus" name="bus_id">
              <option value="">{t('later')}</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{t('bus')} {b.number}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">{t('add')}</button>
        </div>
      </form>
    </>
  );
}
