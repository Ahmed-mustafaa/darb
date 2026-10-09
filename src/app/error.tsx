'use client';

/** Friendly page instead of a blank screen when something fails. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
  return (
    <main className="center">
      <div className="auth">
        <h1>{ar ? 'حدث خطأ' : 'Something went wrong'}</h1>
        <p className="muted">{ar ? 'حاول مرة أخرى. إذا تكرر الخطأ، أرسل هذا الكود للدعم:' : 'Please try again. If it keeps happening, send this code to support:'}</p>
        <p className="mono small" style={{ overflowWrap: 'anywhere' }}>{error.digest ?? error.message}</p>
        <button className="btn btn-primary" type="button" onClick={() => reset()}>{ar ? 'حاول مرة أخرى' : 'Try again'}</button>
        <a className="btn" href="/">{ar ? 'الصفحة الرئيسية' : 'Home'}</a>
      </div>
    </main>
  );
}
