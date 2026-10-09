import { getLocale, getT, type Key } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { displayPhone } from '@/lib/phone';
import { egp } from '@/lib/pricing';
import { formatDate } from '@/lib/subscription';
import { Notice } from '@/components/ui';
import { confirmPayment, recordPayment, rejectPayment } from './actions';

type Payment = {
  id: string;
  code: string;
  parent_id: string;
  plan: 'month' | 'term' | 'year';
  children_count: number;
  amount: number;
  method: 'instapay' | 'cash';
  status: 'awaiting_payment' | 'awaiting_review' | 'paid' | 'rejected' | 'refunded';
  reference: string | null;
  payer_name: string | null;
  proof_path: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  reject_reason: string | null;
  created_at: string;
};

const ERRORS: Record<string, Key> = { duplicate: 'duplicateReference', amount: 'amountRequired', generic: 'errorGeneric' };
const OK: Record<string, Key> = { confirmed: 'paymentConfirmed', rejected: 'paymentRejected' };
const STATUS_CLASS: Record<Payment['status'], string> = { awaiting_payment: '', awaiting_review: 'warn', paid: 'ok', rejected: '', refunded: 'teal' };

export default async function PaymentsPage({ searchParams }: { searchParams: { ok?: string; error?: string; assigned?: string } }) {
  const locale = getLocale();
  const t = getT(locale);
  const supabase = createClient();
  const [{ data: payRows, error }, { data: parentRows }] = await Promise.all([
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('parents').select('id, full_name, phone').order('full_name'),
  ]);
  if (error) throw new Error(error.message);
  const payments = (payRows ?? []) as Payment[];
  const parents = (parentRows ?? []) as { id: string; full_name: string; phone: string }[];
  const parentOf = (id: string) => parents.find((p) => p.id === id);

  const queue = payments.filter((p) => p.status === 'awaiting_review').reverse(); // oldest first
  const proofUrls = new Map<string, string>();
  const paths = queue.map((p) => p.proof_path).filter((x): x is string => !!x);
  if (paths.length) {
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrls(paths, 60 * 60);
    data?.forEach((d) => d.signedUrl && d.path && proofUrls.set(d.path, d.signedUrl));
  }

  const sum = (s: Payment['status']) => payments.filter((p) => p.status === s).reduce((a, p) => a + Number(p.amount), 0);
  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }) : '—';
  const planLabel = (p: Payment['plan']) => t(`plan_${p}` as Key);

  return (
    <>
      <div className="page-head"><h1>{t('payments')}</h1></div>
      <Notice
        ok={
          searchParams.ok
            ? t(OK[searchParams.ok] ?? 'saved') +
              (searchParams.ok === 'confirmed' && Number(searchParams.assigned) > 0
                ? locale === 'ar'
                  ? ` · تم تسكين ${searchParams.assigned} طفل على أتوبيس تلقائيًا`
                  : ` · ${searchParams.assigned} child(ren) placed on a bus automatically`
                : '')
            : undefined
        }
        error={searchParams.error ? t(ERRORS[searchParams.error] ?? 'errorGeneric') : undefined}
      />

      <section className="kpis">
        <div className={queue.length ? 'kpi warn' : 'kpi'}>
          <span className="k">{t('toReview')}</span>
          <span className="v">{queue.length}</span>
          <span className="small muted num">{egp(sum('awaiting_review'), locale)}</span>
        </div>
        <div className="kpi">
          <span className="k">{t('confirmedTotal')}</span>
          <span className="v num" style={{ fontSize: 24 }}>{egp(sum('paid'), locale)}</span>
        </div>
        <div className="kpi">
          <span className="k">{t('awaitingPayment')}</span>
          <span className="v">{payments.filter((p) => p.status === 'awaiting_payment').length}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>{t('reviewQueue')}</h2><span className="small muted">{t('reviewHelp')}</span></div>
        <div className="panel-b">
          {queue.length === 0 && <p className="muted">{t('nothingToReview')}</p>}
          <div className="cards">
            {queue.map((p) => {
              const parent = parentOf(p.parent_id);
              const proof = p.proof_path ? proofUrls.get(p.proof_path) : undefined;
              return (
                <article key={p.id} className="card">
                  <div className="card-t">
                    <h3 className="num">{egp(p.amount, locale)}</h3>
                    <span className="chip warn mono">{p.code}</span>
                  </div>
                  <dl className="kv">
                    <dt>{t('parent')}</dt><dd>{parent?.full_name}<span className="mono small muted" style={{ display: 'block' }}>{displayPhone(parent?.phone)}</span></dd>
                    <dt>{t('plan')}</dt><dd>{planLabel(p.plan)} · {p.children_count}</dd>
                    <dt>{t('reference')}</dt><dd className="mono">{p.reference ?? '—'}</dd>
                    <dt>{t('payerName')}</dt><dd>{p.payer_name ?? '—'}</dd>
                    <dt>{t('submittedAt')}</dt><dd>{when(p.submitted_at)}</dd>
                  </dl>
                  {proof ? (
                    <a href={proof} target="_blank" rel="noreferrer" title={t('screenshot')}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proof} alt={t('screenshot')} style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }} />
                    </a>
                  ) : (
                    <p className="small muted">{t('noScreenshot')}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <form action={confirmPayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-teal" type="submit">{t('confirmPaid')}</button>
                    </form>
                    <form action={rejectPayment} className="inline-form">
                      <input type="hidden" name="id" value={p.id} />
                      <select className="input input-sm" name="reason" aria-label={t('rejectReason')} style={{ width: 'auto' }}>
                        {(['not_received', 'wrong_amount', 'unreadable', 'duplicate'] as const).map((r) => (
                          <option key={r} value={r}>{t(`reason_${r}`)}</option>
                        ))}
                      </select>
                      <button className="btn btn-sm btn-danger" type="submit">{t('reject')}</button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>{t('history')}</h2></div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>{t('paymentCode')}</th><th>{t('parent')}</th><th>{t('plan')}</th><th>{t('amount')}</th><th>{t('method')}</th><th>{t('reference')}</th><th>{t('status')}</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={7} className="muted">—</td></tr>}
              {payments.map((p) => {
                const parent = parentOf(p.parent_id);
                return (
                  <tr key={p.id}>
                    <td className="mono">{p.code}<span className="sub">{when(p.paid_at ?? p.submitted_at ?? p.created_at)}</span></td>
                    <td>{parent?.full_name}<span className="sub mono">{displayPhone(parent?.phone)}</span></td>
                    <td>{planLabel(p.plan)} · {p.children_count}</td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{egp(p.amount, locale)}</td>
                    <td>{t(`method_${p.method}` as Key)}</td>
                    <td className="mono small">{p.reference ?? '—'}</td>
                    <td>
                      <span className={`chip ${STATUS_CLASS[p.status]}`}>{t(`status_${p.status}` as Key)}</span>
                      {p.status === 'rejected' && p.reject_reason && <span className="sub">{t(`reason_${p.reject_reason}` as Key)}</span>}
                      {p.status === 'paid' && (p as any).valid_until && (
                        <span className="sub">{t('h_until')} {formatDate((p as any).valid_until, locale)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <form className="panel" id="record" action={recordPayment}>
        <div className="panel-h"><h2>{t('recordPayment')}</h2><span className="small muted">{t('recordHelp')}</span></div>
        <div className="panel-b form-grid">
          <div className="field">
            <label htmlFor="rp-parent">{t('parent')}</label>
            <select className="input" id="rp-parent" name="parent_id" required>
              <option value="">—</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {displayPhone(p.phone)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rp-plan">{t('plan')}</label>
            <select className="input" id="rp-plan" name="plan">
              <option value="month">{t('plan_month')}</option>
              <option value="term">{t('plan_term')}</option>
              <option value="year">{t('plan_year')}</option>
            </select>
          </div>
          <div className="field"><label htmlFor="rp-amount">{t('amount')}</label><input className="input num" id="rp-amount" name="amount" type="number" min={1} step={5} required /></div>
          <div className="field">
            <label htmlFor="rp-method">{t('method')}</label>
            <select className="input" id="rp-method" name="method">
              <option value="instapay">{t('method_instapay')}</option>
              <option value="cash">{t('method_cash')}</option>
            </select>
          </div>
          <div className="field"><label htmlFor="rp-ref">{t('reference')}</label><input className="input mono" id="rp-ref" name="reference" dir="ltr" /></div>
          <button className="btn btn-primary" type="submit">{t('add')}</button>
        </div>
      </form>
    </>
  );
}
