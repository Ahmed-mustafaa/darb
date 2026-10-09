'use client';

/** Switches between Arabic and English and reloads the same page. */
export function LangSwitchButton({ locale }: { locale: 'ar' | 'en' }) {
  const to = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      className="btn btn-sm"
      lang={to}
      onClick={() => {
        document.cookie = `lang=${to}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        window.location.reload();
      }}
    >
      {to === 'en' ? 'English' : 'العربية'}
    </button>
  );
}
