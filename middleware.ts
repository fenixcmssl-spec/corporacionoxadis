import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME_SUPERADMIN, COOKIE_NAME_TENANT } from './lib/auth/constants';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Rutas públicas excluidas de verificación perimetral
  if (
    pathname === '/' ||
    pathname === '/planes' ||
    pathname === '/checkout' ||
    pathname === '/tienda' ||
    pathname === '/login' ||
    pathname === '/superadmin/login' ||
    pathname === '/acceso-denegado' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 2. Perímetro SuperAdmin (/superadmin/*)
  if (pathname.startsWith('/superadmin')) {
    const rootSession = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;
    if (!rootSession) {
      const loginUrl = new URL('/superadmin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Perímetro Admin Tenant (/admin/*)
  if (pathname.startsWith('/admin')) {
    const tenantSession = req.cookies.get(COOKIE_NAME_TENANT)?.value;
    const rootSession = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;

    if (!tenantSession && !rootSession) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Perímetro API SuperAdmin (/api/superadmin/*)
  if (pathname.startsWith('/api/superadmin')) {
    const rootSession = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;
    if (!rootSession) {
      return NextResponse.json(
        { error: 'Autenticación de SuperAdministrador requerida' },
        { status: 401 }
      );
    }
  }

  // 5. Perímetro API Admin Tenant (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    const tenantSession = req.cookies.get(COOKIE_NAME_TENANT)?.value;
    const rootSession = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;

    if (!tenantSession && !rootSession) {
      return NextResponse.json(
        { error: 'Autenticación de organización requerida' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/admin/:path*',
    '/api/superadmin/:path*',
    '/api/admin/:path*',
  ],
};
