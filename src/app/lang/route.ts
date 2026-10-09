import { NextResponse, type NextRequest } from 'next/server';

/** /lang?to=en&next=/admin → sets the language cookie and goes back. */
export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') === 'en' ? 'en' : 'ar';
  const next = request.nextUrl.searchParams.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const res = NextResponse.redirect(new URL(safeNext, request.url));
  res.cookies.set('lang', to, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return res;
}
