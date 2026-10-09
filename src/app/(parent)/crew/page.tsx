import { getLocale, getT } from '@/lib/i18n';
import { requireCrew } from '@/lib/crew';
import { loadTrip } from '@/lib/trips';
import { displayPhone } from '@/lib/phone';
import { testTools } from '@/lib/flags';
import { Plate } from '@/components/ui';
import { ConfirmButton } from '@/components/client';
import { AutoRefresh, ShareLocation } from '@/components/live-client';
import { crewEndTrip, crewMarkChild, crewSignOut, crewStartTrip } from './actions';

export default async function CrewHome() {
  const locale = getLocale();
  const t = getT(locale);
  const { db, staff, bus, trip } = await requireCrew();

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div>
        <span className="small muted">{staff.role === 'driver' ? t('role_driver') : t('role_supervisor')} · {staff.full_name}</span>
        <h1 style={{ fontSize: 24 }}>{bus ? `${t('bus')} ${bus.number}` : t('brand')}</h1>
      </div>
      {bus && <Plate letters={bus.plate_letters} number={bus.plate_number} />}
    </div>
  );
  const signOut = (
    <form action={crewSignOut}><button className="btn btn-ghost" type="submit">{t('signOut')}</button></form>
  );

  if (!bus) {
    return <div className="stack">{header}<p className="notice bad">{t('c_noBus')}</p>{signOut}</div>;
  }

  if (!trip) {
    return (
      <div className="stack">
        {header}
        <form action={crewStartTrip} className="stack">
          <button className="btn btn-primary btn-block" name="kind" value="morning" type="submit">{t('c_startMorning')}</button>
          <button className="btn btn-block" name="kind" value="afternoon" type="submit">{t('c_startAfternoon')}</button>
        </form>
        <p className="help">{t('c_keepOpen')}</p>
        {signOut}
      </div>
    );
  }

  const data = await loadTrip(db, trip.id);
  const stops = data?.stops ?? [];
  const childIds = stops.flatMap((s) => s.children.map((c) => c.child_id));
  const { data: kids } = childIds.length
    ? await db.from('children').select('id, full_name, notes').in('id', childIds)
    : { data: [] as { id: string; full_name: string; notes: string | null }[] };
  const nameOf = (id: string) => kids?.find((k) => k.id === id);
  const parentOf = (id: string) => data?.parents.find((p: any) => p.id === id);
  const next = stops.find((s) => !s.done);
  const morning = trip.kind === 'morning';
  const isSupervisor = staff.role === 'supervisor';
  const lastKnown = data?.location ? { lat: data.location.lat, lng: data.location.lng } : null;
  const statusLabel = (st: string) =>
    st === 'picked_up' ? (morning ? t('c_pickedUp') : t('c_onBus')) : st === 'absent' ? t('c_absent') : st === 'dropped_off' ? t('c_droppedOff') : t('c_waiting');

  return (
    <div className="stack">
      <AutoRefresh seconds={15} />
      {header}
      <span className="chip ok" style={{ justifySelf: 'start' }}>{morning ? t('c_tripMorning') : t('c_tripAfternoon')}</span>
      <ShareLocation
        active
        nextStop={next?.home ?? null}
        lastKnown={lastKnown}
        testMode={testTools()}
        labels={{
          sharing: t('c_sharing'),
          notSharing: t('c_notSharing'),
          lastSent: t('c_lastSent'),
          denied: t('c_gpsDenied'),
          keepOpen: t('c_keepOpen'),
          simulate: t('c_simulate'),
          stopSim: t('c_stopSim'),
        }}
      />

      {stops.length === 0 ? (
        <p className="notice bad">{t('c_noRiders')}</p>
      ) : next ? (
        <section className="paybox">
          <span className="label">{t('c_nextStop')}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>{parentOf(next.parent_id)?.full_name}</h2>
            {data?.etas.get(next.seq) != null && <span className="num"><b>{data.etas.get(next.seq)}</b> {t('c_min')}</span>}
          </div>
          {(parentOf(next.parent_id)?.address || parentOf(next.parent_id)?.landmark) && (
            <p className="small">{[parentOf(next.parent_id)?.address, parentOf(next.parent_id)?.landmark].filter(Boolean).join(' · ')}</p>
          )}
          <p className="small">{next.children.map((c) => nameOf(c.child_id)?.full_name).join(' · ')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {next.home && (
              <a className="btn btn-teal" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${next.home.lat},${next.home.lng}&travelmode=driving`}>
                {t('c_navigate')}
              </a>
            )}
            <a className="btn" href={`tel:${parentOf(next.parent_id)?.phone}`}>{displayPhone(parentOf(next.parent_id)?.phone)}</a>
          </div>
        </section>
      ) : (
        <p className="notice ok">{t('c_allDone')}</p>
      )}

      {!isSupervisor && <p className="help">{t('c_driverHint')}</p>}

      <h2 style={{ fontSize: 17 }}>{morning ? t('c_pickups') : t('c_dropoffs')}</h2>
      {stops.map((s) => {
        const p = parentOf(s.parent_id);
        return (
          <div key={s.seq} className={`stoprow${s.done ? ' done' : ''}${next?.seq === s.seq ? ' next' : ''}`}>
            <div className="h">
              <strong>{s.seq}. {p?.full_name}</strong>
              <span className="small mono muted">{s.done ? '✓' : data?.etas.get(s.seq) != null ? `${data.etas.get(s.seq)} ${t('c_min')}` : ''}</span>
            </div>
            {s.children.map((c) => {
              const kid = nameOf(c.child_id);
              const doneValue = morning ? 'picked_up' : 'dropped_off';
              return (
                <div key={c.child_id} className="kidline">
                  <span>
                    {kid?.full_name} <span className="chip">{statusLabel(c.status)}</span>
                    {kid?.notes && <span className="small" style={{ color: 'var(--warn)', display: 'block' }}>{kid.notes}</span>}
                  </span>
                  {isSupervisor && (
                    <span className="acts">
                      {c.status === (morning ? 'waiting' : 'picked_up') ? (
                        <>
                          <form action={crewMarkChild}><input type="hidden" name="child_id" value={c.child_id} /><button className="btn btn-sm btn-teal" name="status" value={doneValue}>{morning ? t('c_pickedUp') : t('c_droppedOff')}</button></form>
                          {morning && <form action={crewMarkChild}><input type="hidden" name="child_id" value={c.child_id} /><button className="btn btn-sm" name="status" value="absent">{t('c_absent')}</button></form>}
                        </>
                      ) : (
                        <form action={crewMarkChild}><input type="hidden" name="child_id" value={c.child_id} /><input type="hidden" name="prev" value={c.status} /><button className="btn btn-sm btn-ghost" name="status" value={morning ? 'waiting' : 'picked_up'}>{t('c_undo')}</button></form>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <form action={crewEndTrip}>
        <ConfirmButton className="btn btn-block" message={t('c_endConfirm')}>{t('c_endTrip')}</ConfirmButton>
      </form>
      {signOut}
    </div>
  );
}
