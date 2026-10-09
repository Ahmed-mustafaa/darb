import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** The version the server is running now. Phones compare it with the version they loaded. */
export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'local' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
