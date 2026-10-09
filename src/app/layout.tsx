import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/lib/i18n';
import { flashMessages } from '@/lib/i18n-flash';
import { Suspense } from 'react';
import { ResultAlert } from '@/components/alert-client';
import { VersionGuard } from '@/components/version-client';
import './globals.css';

export const metadata: Metadata = {
  title: 'Darb · درب',
  description: 'School transport, tracked live',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2A800',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>
        {children}
        <VersionGuard
          labels={
            locale === 'ar'
              ? { title: 'يوجد إصدار جديد', text: 'تم تحديث درب. يجب التحديث للمتابعة.', button: 'تحديث الآن' }
              : { title: 'New version available', text: 'Darb has been updated. Update to continue.', button: 'Update now' }
          }
        />
        <footer className="version" aria-label="App version">
          {locale === 'ar' ? 'الإصدار' : 'Version'} {process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_TIME}
        </footer>
        <Suspense fallback={null}>
          <ResultAlert messages={flashMessages(locale)} title={locale === 'ar' ? 'تم بنجاح' : 'Done'} ok={locale === 'ar' ? 'حسنًا' : 'OK'} />
        </Suspense>
      </body>
    </html>
  );
}
