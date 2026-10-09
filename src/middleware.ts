import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from '@/lib/supabase/env';

/** Keeps the Supabase session fresh and sends signed-out visitors of /admin to the login page. */
export async function middleware(request: NextRequest) {
  // Lets pages know their own path (used by the language switch).
  request.headers.set('x-pathname', request.nextUrl.pathname);
  let response = NextResponse.next({ request });

  const { url, key } = supabaseEnv();
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith('/admin') && !path.startsWith('/admin/login') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
