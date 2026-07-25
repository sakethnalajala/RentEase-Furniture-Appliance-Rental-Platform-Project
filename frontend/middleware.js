import { NextResponse } from 'next/server';

// Route-group -> role prefixes protected once each role's dashboard pages land (Phase 6).
// Reads a plain `rentease_role` cookie set client-side after login (see lib/cookies.js) —
// this is a UX redirect only; the API enforces real authorization via JWT + RBAC regardless
// of what this cookie says, since it's same-origin to the Next.js app and not the httpOnly
// refresh-token cookie (which lives on the separate API domain and isn't readable here).
const PROTECTED_PREFIXES = {
  '/customer': ['customer'],
  '/vendor': ['vendor'],
  '/delivery': ['delivery_partner'],
  '/admin': ['admin'],
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('rentease_role')?.value;

  const matchedPrefix = Object.keys(PROTECTED_PREFIXES).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return NextResponse.next();

  if (!role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!PROTECTED_PREFIXES[matchedPrefix].includes(role)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/customer/:path*', '/vendor/:path*', '/delivery/:path*', '/admin/:path*'],
};
