import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 30 30">
        <path d="M5 21 C 10 21, 10 9, 15 9 S 20 21, 25 21" fill="none" stroke="#1C1400" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function LangSwitch({ locale, next }: { locale: Locale; next: string }) {
  return (
    <Link className="btn btn-sm" href={`/lang?to=${locale === 'ar' ? 'en' : 'ar'}&next=${encodeURIComponent(next)}`}>
      {locale === 'ar' ? 'English' : 'العربية'}
    </Link>
  );
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

export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="notice bad" role="alert">{error}</p>;
  if (ok) return <p className="notice ok" role="status">{ok}</p>;
  return null;
}

export function SeatBar({ used, capacity }: { used: number; capacity: number }) {
  const over = used > capacity;
  return (
    <div className={over ? 'bar over' : 'bar'} aria-hidden="true">
      <i style={{ width: `${Math.min(100, (used / Math.max(1, capacity)) * 100)}%` }} />
    </div>
  );
}
