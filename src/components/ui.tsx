import { getLocale, type Locale } from '@/lib/i18n';
import { LangSwitchButton } from './lang-client';
import { ErrorAlert } from './alert-client';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 30 30">
        <path d="M5 21 C 10 21, 10 9, 15 9 S 20 21, 25 21" fill="none" stroke="#1C1400" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Language button. A real button (not a link) so the browser never "pre-opens" it and flips the language. */
export function LangSwitch({ locale }: { locale: Locale; next?: string }) {
  return <LangSwitchButton locale={locale} />;
}

const toArabicDigits = (s: string) => s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export function Plate({ letters, number }: { letters: string | null; number: string | null }) {
  if (!letters && !number) return <span className="muted small">—</span>;
  return (
    <span className="plate" title={`${letters ?? ''} ${number ?? ''}`}>
      <span className="plate-top">EGYPT · مصر</span>
      <span className="plate-body">
        <span>{toArabicDigits(number ?? '')}</span>
        <span dir="rtl">{letters}</span>
      </span>
    </span>
  );
}

/** Errors: an alert over a dimmed screen, plus the same text on the page. Success messages come from <ResultAlert/>. */
export function Notice({ ok, error }: { ok?: string; error?: string }) {
  void ok;
  if (!error) return null;
  const ar = getLocale() === 'ar';
  return (
    <>
      <p className="notice bad" role="alert">{error}</p>
      <ErrorAlert text={error} title={ar ? 'تعذر إتمام العملية' : 'That didn’t work'} ok={ar ? 'حسنًا' : 'OK'} />
    </>
  );
}

export function SeatBar({ used, capacity }: { used: number; capacity: number }) {
  const over = used > capacity;
  return (
    <div className={over ? 'bar over' : 'bar'} aria-hidden="true">
      <i style={{ width: `${Math.min(100, (used / Math.max(1, capacity)) * 100)}%` }} />
    </div>
  );
}
