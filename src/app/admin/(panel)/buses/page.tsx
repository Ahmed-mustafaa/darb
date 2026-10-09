import Link from 'next/link';
import { getLocale, getT, schoolName } from '@/lib/i18n';
import { loadAll, seatsUsed } from '@/lib/data';
import { Notice, SeatBar } from '@/components/ui';
import { ConfirmButton } from '@/components/client';
import { addBus, deleteBus, updateBus } from './actions';

const MODELS = ['Toyota Hiace', 'Hyundai H350', 'King Long Kingo', 'Mercedes Sprinter', 'Other'];

export default async function BusesPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  const { buses, staff, schools, children } = await loadAll();
  const used = seatsUsed(children);
  const drivers = staff.filter((s) => s.role === 'driver' && s.active);
  const sups = staff.filter((s) => s.role === 'supervisor' && s.active);
  const onBus = (id: string) => buses.find((b) => b.driver_id === id || b.supervisor_id === id);
  const nextNumber = buses.reduce((m, b) => Math.max(m, b.number), 0) + 1;

  return (
    <>
      <div className="page-head"><h1>{t('nav_buses')}</h1></div>
      <Notice
        ok={searchParams.ok ? t('saved') : undefined}
        error={searchParams.error === 'duplicate' ? t('duplicateBus') : searchParams.error ? t('errorGeneric') : undefined}
      />
      <div className="cards">
        {buses.map((b) => {
          const n = used.get(b.id) ?? 0;
          return (
            <form key={b.id} className="card" action={updateBus}>
              <input type="hidden" name="id" value={b.id} />
              <div className="card-t">
                <h3>{t('bus')} {b.number}</h3>
                <Link className="btn btn-sm" href={`/admin/children?bus=${b.id}`}>{t('seeChildren')}</Link>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span className="small muted num">{n} / {b.capacity} {t('seatsUsed')}</span>
                <SeatBar used={n} capacity={b.capacity} />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label htmlFor={`pn-${b.id}`}>{t('plateNumber')}</label>
                  <input className="input mono" id={`pn-${b.id}`} name="plate_number" defaultValue={b.plate_number ?? ''} inputMode="numeric" maxLength={4} />
                </div>
                <div className="field">
                  <label htmlFor={`pl-${b.id}`}>{t('plateLetters')}</label>
                  <input className="input" id={`pl-${b.id}`} name="plate_letters" defaultValue={b.plate_letters ?? ''} dir="rtl" maxLength={7} placeholder="ق ب ر" />
                </div>
                <div className="field">
                  <label htmlFor={`m-${b.id}`}>{t('model')}</label>
                  <select className="input" id={`m-${b.id}`} name="model" defaultValue={b.model ?? ''}>
                    <option value="">—</option>
                    {[...new Set([...MODELS, ...(b.model ? [b.model] : [])])].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`c-${b.id}`}>{t('capacity')}</label>
                  <input className="input num" id={`c-${b.id}`} name="capacity" type="number" min={1} max={60} defaultValue={b.capacity} />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`s-${b.id}`}>{t('school')}</label>
                <select className="input" id={`s-${b.id}`} name="school_id" defaultValue={b.school_id ?? ''}>
                  <option value="">—</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{schoolName(s, locale)}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`d-${b.id}`}>{t('driver')}</label>
                <select className="input" id={`d-${b.id}`} name="driver_id" defaultValue={b.driver_id ?? ''}>
                  <option value="">{t('notAssigned')}</option>
                  {drivers.map((p) => {
                    const other = onBus(p.id);
                    return <option key={p.id} value={p.id}>{p.full_name}{other && other.id !== b.id ? ` (${t('bus')} ${other.number})` : ''}</option>;
                  })}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`v-${b.id}`}>{t('supervisor')}</label>
                <select className="input" id={`v-${b.id}`} name="supervisor_id" defaultValue={b.supervisor_id ?? ''}>
                  <option value="">{t('notAssigned')}</option>
                  {sups.map((p) => {
                    const other = onBus(p.id);
                    return <option key={p.id} value={p.id}>{p.full_name}{other && other.id !== b.id ? ` (${t('bus')} ${other.number})` : ''}</option>;
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button className="btn btn-teal" type="submit">{t('save')}</button>
                <ConfirmButton className="btn btn-ghost btn-danger" formAction={deleteBus} message={t('confirmDelete')}>{t('delete')}</ConfirmButton>
              </div>
            </form>
          );
        })}

        <form className="card" action={addBus} style={{ borderStyle: 'dashed' }}>
          <h3>{t('addBus')}</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label htmlFor="nb-number">{t('busNumber')}</label>
              <input className="input num" id="nb-number" name="number" type="number" min={1} defaultValue={nextNumber} required />
            </div>
            <div className="field">
              <label htmlFor="nb-cap">{t('capacity')}</label>
              <input className="input num" id="nb-cap" name="capacity" type="number" min={1} max={60} defaultValue={15} />
            </div>
            <div className="field">
              <label htmlFor="nb-pn">{t('plateNumber')}</label>
              <input className="input mono" id="nb-pn" name="plate_number" inputMode="numeric" maxLength={4} />
            </div>
            <div className="field">
              <label htmlFor="nb-pl">{t('plateLetters')}</label>
              <input className="input" id="nb-pl" name="plate_letters" dir="rtl" maxLength={7} placeholder="ط ر م" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nb-model">{t('model')}</label>
            <select className="input" id="nb-model" name="model">{MODELS.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="nb-school">{t('school')}</label>
            <select className="input" id="nb-school" name="school_id">
              <option value="">—</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{schoolName(s, locale)}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">{t('add')}</button>
        </form>
      </div>
    </>
  );
}
