import Link from 'next/link';
import { GRADES, getLocale, getT, gradeLabel, schoolName, type Key } from '@/lib/i18n';
import { loadAll, seatsUsed } from '@/lib/data';
import { displayPhone } from '@/lib/phone';
import { formatKm, suggestBuses, type LatLng } from '@/lib/geo';
import { Notice } from '@/components/ui';
import { AutoSubmitSelect, ConfirmButton } from '@/components/client';
import { acceptAll, addChild, assignChild, deleteChild } from './actions';

type SP = { filter?: string; bus?: string; q?: string; ok?: string; error?: string };
const ERRORS: Record<string, Key> = { full: 'busFull', name: 'nameRequired', phone: 'invalidPhone', coords: 'badCoordinates', generic: 'errorGeneric' };

export default async function ChildrenPage({ searchParams }: { searchParams: SP }) {
  const locale = getLocale();
  const t = getT(locale);
  const { children, buses, parents, schools, paidParents } = await loadAll();
  const used = seatsUsed(children);
  const parentOf = (id: string) => parents.find((p) => p.id === id);
  const homeOf = (parentId: string): LatLng | null => {
    const p = parentOf(parentId);
    return p && p.home_lat != null && p.home_lng != null ? { lat: p.home_lat, lng: p.home_lng } : null;
  };

  // Suggestions for every child without a bus
  const unassigned = children.filter((c) => !c.bus_id);
  const suggestions = suggestBuses(
    unassigned.map((c) => ({ id: c.id, school_id: c.school_id, home: homeOf(c.parent_id) })),
    buses.map((b) => ({
      id: b.id,
      number: b.number,
      capacity: b.capacity,
      school_id: b.school_id,
      used: used.get(b.id) ?? 0,
      homes: children.filter((c) => c.bus_id === b.id).map((c) => homeOf(c.parent_id)).filter((x): x is LatLng => !!x),
    })),
    Object.fromEntries(schools.map((s) => [s.id, s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null])),
  );
  const acceptable = suggestions.filter((s) => s.busId).map((s) => ({ childId: s.childId, busId: s.busId! }));

  // Filtering
  const filter = searchParams.filter ?? 'all';
  let list = children;
  if (filter === 'unassigned') list = unassigned;
  if (searchParams.bus) list = list.filter((c) => c.bus_id === searchParams.bus);
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    list = list.filter((c) => {
      const p = parentOf(c.parent_id);
      return (c.full_name + ' ' + (p?.full_name ?? '') + ' ' + (p?.phone ?? '')).toLowerCase().includes(q);
    });
  }
  const qs = new URLSearchParams(Object.entries({ filter: searchParams.filter, bus: searchParams.bus, q: searchParams.q }).filter(([, v]) => v) as [string, string][]).toString();
  const returnTo = '/admin/children' + (qs ? '?' + qs : '');
  const busLabel = (id: string | null) => {
    const b = buses.find((x) => x.id === id);
    return b ? `${t('bus')} ${b.number}` : '';
  };

  return (
    <>
      <div className="page-head">
        <h1>{t('nav_children')}</h1>
        <a className="btn" href="#add">{t('addChildTitle')}</a>
      </div>
      <Notice
        ok={searchParams.ok === 'added' ? t('childAdded') : searchParams.ok ? t('saved') : undefined}
        error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined}
      />

      {unassigned.length > 0 && (
        <section className="sugg">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <h2 style={{ fontSize: 17 }}>{unassigned.length} {t('suggestTitle')}</h2>
            {acceptable.length > 0 && (
              <form action={acceptAll}>
                <input type="hidden" name="pairs" value={JSON.stringify(acceptable)} />
                <input type="hidden" name="return" value={returnTo} />
                <button className="btn btn-teal btn-sm" type="submit">{t('acceptAll')}</button>
              </form>
            )}
          </div>
          <p className="small">{t('suggestHelp')}</p>
          {suggestions.map((s) => {
            const c = children.find((x) => x.id === s.childId)!;
            return (
              <div className="sugg-row" key={s.childId}>
                <span>
                  <strong>{c.full_name}</strong>{' '}
                  <span className="muted">· {schoolName(schools.find((x) => x.id === c.school_id), locale)}</span>
                </span>
                {s.busId ? (
                  <>
                    <span>
                      → <strong>{busLabel(s.busId)}</strong>{' '}
                      <span className="muted">
                        · {s.km != null ? `${formatKm(s.km, locale)} ${t('fromPickups')}` : t('leastFull')} ·{' '}
                        <span className="num">{used.get(s.busId) ?? 0}/{buses.find((b) => b.id === s.busId)?.capacity}</span>
                      </span>
                    </span>
                    <form action={assignChild}>
                      <input type="hidden" name="child_id" value={s.childId} />
                      <input type="hidden" name="bus_id" value={s.busId} />
                      <input type="hidden" name="return" value={returnTo} />
                      <button className="btn btn-sm" type="submit">{t('accept')}</button>
                    </form>
                  </>
                ) : (
                  <span className="small" style={{ color: 'var(--bad)' }}>{t('noSeat')}</span>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="panel">
        <div className="toolbar">
          <form method="get" style={{ display: 'flex', gap: 8 }}>
            {searchParams.filter && <input type="hidden" name="filter" value={searchParams.filter} />}
            {searchParams.bus && <input type="hidden" name="bus" value={searchParams.bus} />}
            <input className="input" type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder={t('search')} aria-label={t('search')} style={{ maxWidth: 260 }} />
          </form>
          <Link className="fchip" href="/admin/children" aria-current={filter === 'all' && !searchParams.bus ? 'true' : undefined}>{t('filterAll')} {children.length}</Link>
          <Link className="fchip" href="/admin/children?filter=unassigned" aria-current={filter === 'unassigned' ? 'true' : undefined}>{t('filterUnassigned')} {unassigned.length}</Link>
          {buses.map((b) => (
            <Link key={b.id} className="fchip" href={`/admin/children?bus=${b.id}`} aria-current={searchParams.bus === b.id ? 'true' : undefined}>
              {t('bus')} {b.number} <span className="num">({used.get(b.id) ?? 0}/{b.capacity})</span>
            </Link>
          ))}
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>{t('childName')}</th><th>{t('school')}</th><th>{t('parent')}</th><th>{t('bus')}</th><th /></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="muted">{t('noResults')}</td></tr>}
              {list.map((c) => {
                const p = parentOf(c.parent_id);
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.full_name}</strong>
                      <span className="sub">{gradeLabel(c.grade, locale)}{c.notes ? ' · ' + c.notes : ''}</span>
                    </td>
                    <td>{schoolName(schools.find((s) => s.id === c.school_id), locale)}</td>
                    <td>
                      {p?.full_name}{' '}
                      {c.pending ? (
                        <span className="chip warn">{t('a_pending')}</span>
                      ) : (
                        <span className={paidParents.has(c.parent_id) ? 'chip ok' : 'chip'}>{paidParents.has(c.parent_id) ? t('p_paid') : t('p_notPaid')}</span>
                      )}
                      <span className="sub mono">{displayPhone(p?.phone)}</span>
                      {!homeOf(c.parent_id) && <span className="sub" style={{ color: 'var(--warn)' }}>{t('noPin')}</span>}
                    </td>
                    <td>
                      <form action={assignChild}>
                        <input type="hidden" name="child_id" value={c.id} />
                        <input type="hidden" name="return" value={returnTo} />
                        <AutoSubmitSelect className="input input-sm" name="bus_id" defaultValue={c.bus_id ?? ''} aria-label={`${t('bus')} · ${c.full_name}`}>
                          <option value="">{t('noBus')}</option>
                          {buses.map((b) => (
                            <option key={b.id} value={b.id}>{t('bus')} {b.number} ({used.get(b.id) ?? 0}/{b.capacity})</option>
                          ))}
                        </AutoSubmitSelect>
                      </form>
                    </td>
                    <td>
                      <form action={deleteChild}>
                        <input type="hidden" name="child_id" value={c.id} />
                        <input type="hidden" name="return" value={returnTo} />
                        <ConfirmButton className="btn btn-sm btn-ghost btn-danger" message={t('confirmDelete')}>{t('delete')}</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <form className="panel" id="add" action={addChild}>
        <div className="panel-h"><h2>{t('addChildTitle')}</h2><span className="small muted">{t('addChildHelp')}</span></div>
        <div className="panel-b form-grid">
          <div className="field"><label htmlFor="ac-pn">{t('parentName')}</label><input className="input" id="ac-pn" name="parent_name" required /></div>
          <div className="field"><label htmlFor="ac-ph">{t('parentPhone')}</label><input className="input mono" id="ac-ph" name="phone" inputMode="tel" placeholder="010 1234 5678" required /></div>
          <div className="field"><label htmlFor="ac-cn">{t('childName')}</label><input className="input" id="ac-cn" name="child_name" required /></div>
          <div className="field">
            <label htmlFor="ac-sc">{t('school')}</label>
            <select className="input" id="ac-sc" name="school_id" required>
              <option value="">—</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{schoolName(s, locale)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ac-gr">{t('grade')}</label>
            <select className="input" id="ac-gr" name="grade">
              <option value="">—</option>
              {GRADES.map((g) => <option key={g} value={g}>{gradeLabel(g, locale)}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="ac-loc">{t('coordinates')}</label>
            <input className="input mono" id="ac-loc" name="location" placeholder="30.0131, 31.2089" />
            <span className="help">{t('coordinatesHelp')}</span>
          </div>
          <div className="field"><label htmlFor="ac-no">{t('notes')}</label><input className="input" id="ac-no" name="notes" /></div>
          <div className="field">
            <label htmlFor="ac-bus">{t('bus')}</label>
            <select className="input" id="ac-bus" name="bus_id">
              <option value="">{t('later')}</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{t('bus')} {b.number} ({used.get(b.id) ?? 0}/{b.capacity})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">{t('add')}</button>
        </div>
      </form>
    </>
  );
}
