import Link from 'next/link';
import { getLocale, getT, gradeLabel, schoolName, type Key } from '@/lib/i18n';
import { canRenew, nextStep, requireFamily } from '@/lib/parent';
import { createAdminClient } from '@/lib/supabase/admin';
import { egp } from '@/lib/pricing';
import { displayPhone } from '@/lib/phone';
import { daysBetween, formatDate } from '@/lib/subscription';
import { Plate } from '@/components/ui';
import { parentSignOut } from '../actions';
import { ParentTracker } from '@/components/tracker-client';
import { NotifyButton } from '@/components/notify-client';

const STATUS_CHIP: Record<string, string> = { paid: 'chip ok', awaiting_review: 'chip warn', awaiting_payment: 'chip', rejected: 'chip warn', refunded: 'chip teal' };

/** The parent's home: subscription and its dates, children and their bus, live tracking, payments. */
export default async function ParentHome() {
  const fam = await requireFamily();
  const locale = getLocale();
  const t = getT(locale);
  const latest = fam.payment;
  const active = fam.active;
  const running = !!active && !active.expired;
  const db = createAdminClient();
  const busIds = [...new Set(fam.children.map((c) => c.bus_id).filter((x): x is string => !!x))];
  const [{ data: schools }, { data: buses }] = await Promise.all([
    db.from('schools').select('id, name_ar, name_en'),
    busIds.length
      ? db
          .from('buses')
          .select('id, number, plate_letters, plate_number, driver:staff!buses_driver_id_fkey(full_name, phone), supervisor:staff!buses_supervisor_id_fkey(full_name, phone)')
          .in('id', busIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const next = nextStep(fam);
  const renewalOpen = latest && active && latest.id !== active.id ? latest : null; // a newer payment than the running subscription
  const planName = (p: string) => t(`plan_${p}` as Key);
  const statusName = (s: string) => t(`status_${s}` as Key);
  const total = active?.valid_from && active.valid_until ? daysBetween(active.valid_from, active.valid_until) + 1 : 0;
  const used = active && total ? Math.min(total, Math.max(0, total - active.daysLeft)) : 0;

  return (
    <div className="stack">
      <div>
        <span className="small muted">{t('p_hello')}</span>
        <h1>{fam.parent.full_name}</h1>
        <span className="small mono muted">{displayPhone(fam.parent.phone)}</span>
      </div>

      {/* ── Subscription / registration status ── */}
      {active ? (
        <section className={active.expired ? 'status bad' : 'paybox'}>
          <div className="row-between">
            <h2 style={{ fontSize: 18 }}>{active.expired ? t('h_expired') : t('h_subscription')}</h2>
            <span className="chip ok">{planName(active.plan)}</span>
          </div>
          {active.expired ? (
            <p>{t('h_expiredLead')}</p>
          ) : (
            <>
              <div className="bigeta">
                {active.daysLeft <= 1 ? <span style={{ fontSize: 26 }}>{t('h_lastDay')}</span> : <>{active.daysLeft.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}<small> {t('h_daysLeft')}</small></>}
              </div>
              {total > 0 && <div className="bar" aria-hidden="true"><i style={{ width: `${(used / total) * 100}%`, background: active.daysLeft <= 14 ? 'var(--warn)' : 'var(--teal)' }} /></div>}
            </>
          )}
          <div className="lines">
            <div><span className="muted">{t('h_from')}</span><span>{formatDate(active.valid_from, locale)}</span></div>
            <div><span className="muted">{t('h_until')}</span><strong>{formatDate(active.valid_until, locale)}</strong></div>
            <div><span className="muted">{t('h_paidAmount')}</span><span className="num">{egp(active.amount, locale)} · <span className="mono small">{active.code}</span></span></div>
          </div>
          {!active.expired && active.daysLeft <= 14 && !renewalOpen && <p className="small" style={{ color: 'var(--warn)', fontWeight: 600 }}>{t('h_endsSoon')}</p>}
          {canRenew(fam) && (!renewalOpen || renewalOpen.kind === 'addon') && <Link className="btn btn-primary btn-block" href="/register/package">{t('h_renew')}</Link>}
          {renewalOpen && (
            <div className="row-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span className="small">
                {renewalOpen.kind === 'addon'
                  ? `${t('a_addChild')}: ${renewalOpen.status === 'awaiting_review' ? t('p_statusReview') : t('a_pending')}`
                  : renewalOpen.status === 'awaiting_review' ? t('h_renewalReview') : t('h_renewalPending')}
              </span>
              {renewalOpen.status !== 'awaiting_review' && <Link className="btn btn-sm btn-primary" href="/register/pay">{t('h_finishPayment')}</Link>}
            </div>
          )}
        </section>
      ) : latest?.status === 'awaiting_review' ? (
        <section className="status warn">
          <h2>{t('p_statusReview')}</h2>
          <p>{t('p_statusReviewLead')}</p>
          <p className="small"><span className="mono">{latest.code}</span> · {planName(latest.plan)} · {egp(latest.amount, locale)}</p>
        </section>
      ) : latest?.status === 'rejected' ? (
        <section className="status bad">
          <h2>{t('p_statusRejected')}</h2>
          {latest.reject_reason && <p>{t(`reason_${latest.reject_reason}` as Key)}</p>}
          <Link className="btn btn-primary" href="/register/pay">{t('p_sendAgain')}</Link>
        </section>
      ) : (
        <section className="status warn">
          <h2>{t('p_statusUnpaid')}</h2>
          <Link className="btn btn-primary" href={next === '/parent' ? '/register/package' : next}>{t('p_continue')}</Link>
        </section>
      )}

      {/* ── Live tracking ── */}
      {running && (
        <>
          <ParentTracker
            locale={locale}
            labels={{
              noTrip: t('t_noTrip'),
              noTripLead: t('t_noTripLead'),
              minAway: t('t_minAway'),
              stopsBefore: t('t_stopsBefore'),
              youreNext: t('t_youreNext'),
              doneTrip: t('t_doneTrip'),
              updated: t('t_updated'),
              secAgo: t('t_secAgo'),
              minAgo: t('t_minAgo'),
              noSignal: t('t_noSignal'),
              messages: t('t_messages'),
              bus: t('bus'),
              pickedUp: t('c_pickedUp'),
              onBus: t('c_onBus'),
              absent: t('c_absent'),
              droppedOff: t('c_droppedOff'),
              waiting: t('c_waiting'),
            }}
          />
          <NotifyButton
            vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null}
            labels={{
              turnOn: t('n_turnOn'),
              on: t('n_on'),
              lead: t('n_lead'),
              blocked: t('n_blocked'),
              ios: t('n_ios'),
              unsupported: t('n_unsupported'),
              test: t('n_test'),
              testSent: t('n_testSent'),
              demo: t('n_demo'),
              demoWaiting: t('n_demoWaiting'),
              demoSent: t('n_demoSent'),
              errNotConfigured: t('n_errNotConfigured'),
              errNoSubscription: t('n_errNoSubscription'),
              errSendFailed: t('n_errSendFailed'),
              errSignin: t('n_errSignin'),
              errOffline: t('n_errOffline'),
            }}
          />
        </>
      )}

      {/* ── Children and their bus ── */}
      {fam.children.length > 0 && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t('p_kidsTitle')}</h2>
            {running ? (
              <Link className="btn btn-sm btn-primary" href="/parent/add-child">＋ {t('a_addChild')}</Link>
            ) : (
              latest?.status !== 'awaiting_review' && <Link className="btn btn-sm" href="/register/children">{t('p_editKids')}</Link>
            )}
          </div>
          <div className="panel-b">
            {fam.children.map((c) => {
              const bus = (buses ?? []).find((b: any) => b.id === c.bus_id) as any;
              return (
                <div key={c.id} className="kidrow-home">
                  <div className="row-between">
                    <strong>{c.full_name}</strong>
                    {running && bus && <Plate letters={bus.plate_letters} number={bus.plate_number} />}
                  </div>
                  <span className="small muted">{gradeLabel(c.grade, locale)} · {schoolName((schools ?? []).find((s) => s.id === c.school_id), locale)}</span>
                  {c.notes && <span className="small" style={{ color: 'var(--warn)' }}>{c.notes}</span>}
                  {c.pending ? (
                    <div className="row-between">
                      <span className="chip warn">{t('a_pending')}</span>
                      {latest?.kind === 'addon' && latest.status !== 'awaiting_review' && <Link className="btn btn-sm" href="/register/pay">{t('h_finishPayment')}</Link>}
                    </div>
                  ) : running &&
                    (bus ? (
                      <div className="lines small">
                        <div><span className="muted">{t('bus')}</span><strong>{bus.number}</strong></div>
                        {bus.supervisor && <div><span className="muted">{t('supervisor')}</span><span>{bus.supervisor.full_name} · <span className="mono">{displayPhone(bus.supervisor.phone)}</span></span></div>}
                        {bus.driver && <div><span className="muted">{t('h_driver')}</span><span>{bus.driver.full_name}</span></div>}
                      </div>
                    ) : (
                      <span className="small" style={{ color: 'var(--warn)' }}>{t('p_busPending')}</span>
                    ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Pick-up address ── */}
      <section className="panel">
        <div className="panel-h">
          <h2>{t('h_address')}</h2>
          {!running && latest?.status !== 'awaiting_review' && <Link className="btn btn-sm" href="/register/location">{t('h_edit')}</Link>}
        </div>
        <div className="panel-b">
          {fam.parent.address || fam.parent.landmark ? (
            <p>{[fam.parent.address, fam.parent.landmark].filter(Boolean).join(' · ')}</p>
          ) : (
            <p className="small muted">{t('h_noAddress')}</p>
          )}
          {fam.parent.home_lat != null && (
            <a className="small" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${fam.parent.home_lat},${fam.parent.home_lng}`}>
              <span className="mono">{fam.parent.home_lat.toFixed(5)}, {fam.parent.home_lng?.toFixed(5)}</span>
            </a>
          )}
        </div>
      </section>

      {/* ── Payments ── */}
      {fam.history.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>{t('h_history')}</h2></div>
          <div className="panel-b" style={{ gap: 10 }}>
            {fam.history.map((p) => (
              <div key={p.id} className="row-between small" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                <span>
                  <strong>{p.kind === 'addon' ? t('a_addChild') : planName(p.plan)}</strong> · <span className="num">{egp(p.amount, locale)}</span>
                  <span className="muted" style={{ display: 'block' }}>
                    {p.valid_until ? `${formatDate(p.valid_from, locale)} → ${formatDate(p.valid_until, locale)}` : <span className="mono">{p.code}</span>}
                  </span>
                </span>
                <span className={STATUS_CHIP[p.status] ?? 'chip'}>{statusName(p.status)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="small muted">{t('p_installHint')}</p>
      <form action={parentSignOut}><button className="btn btn-ghost" type="submit">{t('signOut')}</button></form>
    </div>
  );
}
