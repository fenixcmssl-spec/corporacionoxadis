import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/auth/auth-service';
import {
  sessionManager,
  COOKIE_NAME_SUPERADMIN,
  COOKIE_NAME_TENANT,
  getSessionCookieAttributes,
} from '../../../../lib/auth/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const body = await req.json().catch(() => ({}));

    // 1. LOGIN SUPERADMIN
    if (action === 'superadmin-login') {
      const { email, password, securityToken } = body;
      const result = await authService.loginSuperAdmin({
        email: email || '',
        password: password || '',
        securityToken,
        ipAddress: ip,
        userAgent,
      });

      if (!result.success || !result.rawToken || !result.session) {
        return NextResponse.json({ error: result.error || 'Credenciales inválidas' }, { status: 401 });
      }

      const cookieOpts = getSessionCookieAttributes(COOKIE_NAME_SUPERADMIN, result.rawToken);
      const res = NextResponse.json({
        success: true,
        user: {
          id: result.session.userId,
          email: result.session.email,
          fullName: result.session.fullName,
          userType: result.session.userType,
        },
      });

      res.cookies.set(cookieOpts.name, cookieOpts.value, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        maxAge: cookieOpts.maxAge,
      });

      return res;
    }

    // 2. LOGIN TENANT USER & SAAS CLIENT
    if (action === 'tenant-login') {
      const { email, password, requestedTenantId } = body;
      const result = await authService.loginTenantUser({
        email: email || '',
        password: password || '',
        requestedTenantId,
        ipAddress: ip,
        userAgent,
      });

      if (!result.success || !result.rawToken || !result.session) {
        return NextResponse.json({ error: result.error || 'Credenciales inválidas' }, { status: 401 });
      }

      const cookieOpts = getSessionCookieAttributes(COOKIE_NAME_TENANT, result.rawToken);
      const res = NextResponse.json({
        success: true,
        user: {
          id: result.session.userId,
          email: result.session.email,
          fullName: result.session.fullName,
          userType: result.session.userType,
          tenantId: result.session.tenantId,
          role: result.session.role,
        },
      });

      res.cookies.set(cookieOpts.name, cookieOpts.value, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        maxAge: cookieOpts.maxAge,
      });

      return res;
    }

    // 3. LOGOUT (REVOCACIÓN DE SESIÓN)
    if (action === 'logout') {
      const rootToken = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;
      const tenantToken = req.cookies.get(COOKIE_NAME_TENANT)?.value;

      if (rootToken) sessionManager.revokeSession(rootToken);
      if (tenantToken) sessionManager.revokeSession(tenantToken);

      const res = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
      res.cookies.delete(COOKIE_NAME_SUPERADMIN);
      res.cookies.delete(COOKIE_NAME_TENANT);
      return res;
    }

    // 4. CAMBIO DE CONTRASEÑA
    if (action === 'change-password') {
      const { userId, currentPassword, newPassword, revokeOtherSessions } = body;
      const activeRawToken =
        req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value || req.cookies.get(COOKIE_NAME_TENANT)?.value;

      const result = await authService.changePassword({
        userId,
        currentPassword,
        newPassword,
        revokeOtherSessions: Boolean(revokeOtherSessions),
        currentRawToken: activeRawToken,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result);
    }

    // 5. SOLICITUD DE RECUPERACIÓN DE CONTRASEÑA
    if (action === 'request-password-reset') {
      const { email } = body;
      const result = await authService.requestPasswordReset(email || '');
      return NextResponse.json(result);
    }

    // 6. RESTABLECER CONTRASEÑA CON TOKEN
    if (action === 'reset-password') {
      const { token, newPassword } = body;
      const result = await authService.resetPasswordWithToken({
        rawToken: token,
        newPassword,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Acción de autenticación desconocida' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno en el servicio de autenticación' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  if (action === 'me') {
    const rootToken = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;
    const tenantToken = req.cookies.get(COOKIE_NAME_TENANT)?.value;

    if (rootToken) {
      const val = sessionManager.validateSession(rootToken, 'SUPERADMIN');
      if (val.isValid && val.session) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: val.session.userId,
            email: val.session.email,
            fullName: val.session.fullName,
            userType: val.session.userType,
          },
        });
      }
    }

    if (tenantToken) {
      const val = sessionManager.validateSession(tenantToken, 'TENANT_USER');
      if (val.isValid && val.session) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: val.session.userId,
            email: val.session.email,
            fullName: val.session.fullName,
            userType: val.session.userType,
            tenantId: val.session.tenantId,
            role: val.session.role,
          },
        });
      }
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ error: 'Ruta no válida' }, { status: 404 });
}
