import Link from 'next/link';
import { getLocale, getT, gradeLabel, schoolName, type Key } from '@/lib/i18n';
import { nextStep, requireFamily } from '@/lib/parent';
import { createAdminClient } from '@/lib/supabase/admin';
import { egp } from '@/lib/pricing';
import { displayPhone } from '@/lib/phone';
import { parentSignOut } from '../actions';
import { ParentTracker } from '@/components/tracker-client';
import { NotifyButton } from '@/components/notify-client';

export default async function ParentHome() {
  const fam = await requireFamily();
  const locale = getLocale();
  const t = getT(locale);
  const pay = fam.payment;
  const db = createAdminClient();
  const busIds = [...new Set(fam.children.map((c) => c.bus_id).filter((x): x is string => !!x))];
  const [{ data: schools }, { data: buses }] = await Promise.all([
    db.from('schools').select('id, name_ar, name_en'),
    busIds.length
      ? db.from('buses').select('id, number, plate_letters, plate_number, driver:staff!buses_driver_id_fkey(full_name, phone), supervisor:staff!buses_supervisor_id_fkey(full_name, phone)').in('id', busIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const paid = pay?.status === 'paid';
  const next = nextStep(fam);

  return (
    <div className="stack">
      <h1>{t('p_hello')} {fam.parent.full_name.split(' ')[0]}</h1>

      {paid ? (
        <section className="status ok"><h2>{t('p_statusPaid')}</h2><p>{t('p_statusPaidLead')}</p></section>
      ) : pay?.status === 'awaiting_review' ? (
        <section className="status warn">
          <h2>{t('p_statusReview')}</h2>
          <p>{t('p_statusReviewLead')}</p>
          <p className="small mono">{pay.code} · {egp(pay.amount, locale)}</p>
        </section>
      ) : pay?.status === 'rejected' ? (
        <section className="status bad">
          <h2>{t('p_statusRejected')}</h2>
          {pay.reject_reason && <p>{t(`reason_${pay.reject_reason}` as Key)}</p>}
          <Link className="btn btn-primary" href="/register/pay">{t('p_sendAgain')}</Link>
        </section>
      ) : (
        <section className="status warn">
          <h2>{t('p_statusUnpaid')}</h2>
          <Link className="btn btn-primary" href={next === '/parent' ? '/register/pay' : next}>{t('p_continue')}</Link>
        </section>
      )}

      {fam.children.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>{t('p_kidsTitle')}</h2>{!paid && pay?.status !== 'awaiting_review' && <Link className="btn btn-sm" href="/register/children">{t('p_editKids')}</Link>}</div>
          <div className="panel-b">
            {fam.children.map((c) => {
              const bus = (buses ?? []).find((b: any) => b.id === c.bus_id) as any;
              return (
                <div key={c.id} style={{ display: 'grid', gap: 4, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <strong>{c.full_name}</strong>
                  <span className="small muted">{gradeLabel(c.grade, locale)} · {schoolName((schools ?? []).find((s) => s.id === c.school_id), locale)}</span>
                  {paid && (bus ? (
                    <span className="small">
                      {t('bus')} {bus.number}
                      {bus.supervisor && <> · {t('supervisor')}: {bus.supervisor.full_name} <span className="mono">{displayPhone(bus.supervisor.phone)}</span></>}
                    </span>
                  ) : (
                    <span className="small" style={{ color: 'var(--warn)' }}>{t('p_busPending')}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {paid && (
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
          }}
        />
      )}
      {paid && (
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
      )}
      <p className="small muted">{t('p_installHint')}</p>
      <form action={parentSignOut}><button className="btn btn-ghost" type="submit">{t('signOut')}</button></form>
    </div>
  );
}
