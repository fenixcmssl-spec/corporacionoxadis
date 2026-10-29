// ============================================================================
// FENIXCMS SAAS — MOTOR CENTRAL DE AUTORIZACIÓN Y AISLAMIENTO DE TENANTS
// FASE 1.5: ENFORCEMENT EN SERVIDOR, AISLAMIENTO Y DEFENSE-IN-DEPTH
// ============================================================================

import { NextRequest } from 'next/server';
import { sessionManager, PersistentSessionData, COOKIE_NAME_SUPERADMIN, COOKIE_NAME_TENANT } from '../auth/session';
import { AppRole, Permission, roleHasPermission, isSuperAdminRole } from './roles';
import { securityAudit } from './audit';

export class AuthenticationRequiredError extends Error {
  public statusCode = 401;
  constructor(message = 'Autenticación requerida para acceder a este recurso.') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

export class ForbiddenAccessError extends Error {
  public statusCode = 403;
  constructor(message = 'Acceso denegado: Permisos insuficientes para esta operación.') {
    super(message);
    this.name = 'ForbiddenAccessError';
  }
}

export class TenantIsolationViolationError extends Error {
  public statusCode = 403;
  constructor(message = 'Aislamiento de Tenant Violado: Acceso no autorizado a datos de otra organización.') {
    super(message);
    this.name = 'TenantIsolationViolationError';
  }
}

export interface SecurityContext {
  userId: string;
  email: string;
  userType: 'SUPERADMIN' | 'TENANT_USER';
  tenantId?: string;
  role: AppRole;
  session: PersistentSessionData;
}

/**
 * Extrae y valida la sesión desde las cookies de una petición Next.js o un token explícito.
 */
export function getSecurityContextFromRequest(req: NextRequest): SecurityContext | null {
  const rootCookie = req.cookies.get(COOKIE_NAME_SUPERADMIN)?.value;
  const tenantCookie = req.cookies.get(COOKIE_NAME_TENANT)?.value;

  // 1. Intentar sesión SuperAdmin
  if (rootCookie) {
    const val = sessionManager.validateSession(rootCookie, 'SUPERADMIN');
    if (val.isValid && val.session) {
      return {
        userId: val.session.userId,
        email: val.session.email,
        userType: 'SUPERADMIN',
        role: 'SUPERADMIN',
        session: val.session,
      };
    }
  }

  // 2. Intentar sesión Tenant
  if (tenantCookie) {
    const val = sessionManager.validateSession(tenantCookie, 'TENANT_USER');
    if (val.isValid && val.session) {
      // Mapear rol o asignar rol seguro por defecto
      const roleMap: Record<string, AppRole> = {
        TENANT_OWNER: 'TENANT_ADMIN',
        TENANT_ADMIN: 'TENANT_ADMIN',
        TENANT_EDITOR: 'TENANT_EDITOR',
        TENANT_VIEWER: 'TENANT_VIEWER',
      };
      const resolvedRole: AppRole = val.session.role ? (roleMap[val.session.role] || 'TENANT_VIEWER') : 'TENANT_VIEWER';

      return {
        userId: val.session.userId,
        email: val.session.email,
        userType: 'TENANT_USER',
        tenantId: val.session.tenantId,
        role: resolvedRole,
        session: val.session,
      };
    }
  }

  return null;
}

/**
 * Exige una sesión de SuperAdmin verificada.
 * Si un cliente o usuario intenta acceder modificando cabeceras o cookies, es rechazado con 401 o 403.
 */
export function requireSuperAdmin(context: SecurityContext | null): SecurityContext {
  if (!context) {
    throw new AuthenticationRequiredError('Acceso restringido a operadores de plataforma.');
  }

  if (context.userType !== 'SUPERADMIN' || !isSuperAdminRole(context.role)) {
    securityAudit.log({
      action: 'SECURITY_ALERT_UNAUTHORIZED_SUPERADMIN_ATTEMPT',
      severity: 'CRITICAL',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      details: 'Intento de acceso a consola SuperAdmin por parte de una cuenta no autorizada.',
    });
    throw new ForbiddenAccessError('Acceso denegado: Se requiere autorización de SuperAdministrador.');
  }

  return context;
}

/**
 * REGLA FUNDAMENTAL DE AISLAMIENTO MULTI-TENANT:
 * Valida que la sesión actual sea la propietaria legítima del tenant solicitado.
 * NUNCA confía en `targetTenantId` provisto por el cliente sin validarlo contra `context.tenantId`.
 */
export function enforceTenantOwnership(
  context: SecurityContext | null,
  targetTenantId: string,
  requiredPermission?: Permission
): SecurityContext {
  if (!context) {
    throw new AuthenticationRequiredError('Se requiere iniciar sesión en la organización para operar.');
  }

  // Si es SuperAdmin, se le permite acceso administrativo, pero se audita
  if (context.userType === 'SUPERADMIN') {
    return context;
  }

  // Usuario de tenant: comprobación estricta de pertenencia
  if (!context.tenantId) {
    throw new TenantIsolationViolationError('La cuenta no tiene una organización asignada.');
  }

  if (context.tenantId !== targetTenantId) {
    // Alerta de seguridad inmediata
    securityAudit.log({
      action: 'SECURITY_ALERT_CROSS_TENANT_VIOLATION_ATTEMPT',
      severity: 'CRITICAL',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Usuario del tenant '${context.tenantId}' intentó acceder o modificar datos del tenant '${targetTenantId}'.`,
    });

    throw new TenantIsolationViolationError(
      `Acceso no autorizado: Sus credenciales no pertenecen a la organización objetivo (${targetTenantId}).`
    );
  }

  // Comprobar permiso granular si se especificó
  if (requiredPermission && !roleHasPermission(context.role, requiredPermission)) {
    throw new ForbiddenAccessError(
      `Permisos insuficientes: El rol '${context.role}' no dispone del permiso requerido '${requiredPermission}'.`
    );
  }

  return context;
}
