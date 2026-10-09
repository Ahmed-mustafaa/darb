import Link from 'next/link';
import { getLocale, getT, schoolName } from '@/lib/i18n';
import { loadAll, seatsUsed } from '@/lib/data';
import { Plate, SeatBar } from '@/components/ui';
import { displayPhone } from '@/lib/phone';

export default async function Overview() {
  const locale = getLocale();
  const t = getT(locale);
  const { buses, children, staff, schools } = await loadAll();
  const used = seatsUsed(children);
  const capacity = buses.reduce((a, b) => a + b.capacity, 0);
  const assigned = children.filter((c) => c.bus_id).length;
  const unassigned = children.length - assigned;
  const drivers = staff.filter((s) => s.role === 'driver' && s.active).length;
  const sups = staff.filter((s) => s.role === 'supervisor' && s.active).length;
  const person = (id: string | null) => staff.find((s) => s.id === id);

  return (
    <>
      <div className="page-head"><h1>{t('nav_overview')}</h1></div>
      <section className="kpis">
        <div className="kpi"><span className="k">{t('kpi_buses')}</span><span className="v">{buses.length}</span></div>
        <div className="kpi">
          <span className="k">{t('kpi_seats')}</span>
          <span className="v">{assigned}<small> / {capacity}</small></span>
          <span className="small muted">{capacity ? Math.round((assigned / capacity) * 100) : 0}% {t('ofCapacity')}</span>
        </div>
        <Link className={unassigned ? 'kpi warn' : 'kpi'} href="/admin/children?filter=unassigned">
          <span className="k">{t('kpi_unassigned')}</span>
          <span className="v">{unassigned}</span>
          <span className="small muted">{unassigned ? t('reviewSuggestions') : t('everyoneAssigned')}</span>
        </Link>
        <div className="kpi"><span className="k">{t('kpi_staff')}</span><span className="v">{drivers}<small> · {sups}</small></span></div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>{t('fleet')}</h2><span className="small muted">{t('liveMapSoon')}</span></div>
        <div className="panel-b">
          <div className="cards">
            {buses.map((b) => {
              const d = person(b.driver_id);
              const s = person(b.supervisor_id);
              const n = used.get(b.id) ?? 0;
              return (
                <Link key={b.id} href={`/admin/children?bus=${b.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card-t">
                    <h3>{t('bus')} {b.number}</h3>
                    <Plate letters={b.plate_letters} number={b.plate_number} />
                  </div>
                  <dl className="kv">
                    <dt>{t('school')}</dt><dd>{schoolName(schools.find((x) => x.id === b.school_id), locale)}</dd>
                    <dt>{t('driver')}</dt><dd>{d ? <>{d.full_name} <span className="mono small muted">{displayPhone(d.phone)}</span></> : <span className="muted">{t('notAssigned')}</span>}</dd>
                    <dt>{t('supervisor')}</dt><dd>{s ? <>{s.full_name} <span className="mono small muted">{displayPhone(s.phone)}</span></> : <span className="muted">{t('notAssigned')}</span>}</dd>
                  </dl>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span className="small muted num">{n} / {b.capacity} {t('seatsUsed')}</span>
                    <SeatBar used={n} capacity={b.capacity} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
