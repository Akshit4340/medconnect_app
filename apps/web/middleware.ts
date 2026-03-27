import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for access token in cookies
  const accessToken = request.cookies.get('medconnect_access_token')?.value;
  const refreshToken = request.cookies.get('medconnect_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const payload = parseJwt(accessToken || '');

  if (payload) {
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${payload.role}`, request.url));
    }
    if (pathname.startsWith('/doctor') && payload.role !== 'doctor') {
      return NextResponse.redirect(new URL(`/${payload.role}`, request.url));
    }
    if (pathname.startsWith('/patient') && payload.role !== 'patient') {
      return NextResponse.redirect(new URL(`/${payload.role}`, request.url));
    }
  }

  return NextResponse.next();
}

function parseJwt(token: string): { role: string } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
