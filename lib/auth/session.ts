// ============================================================================
// FENIXCMS SAAS — GESTOR DE SESIONES Y TOKENS CRIPTOGRÁFICOS
// FASE 1.4: SESIONES PERSISTENTES, TOKENS HASHEADOS Y COOKIES SEGURAS
// ============================================================================

import crypto from 'crypto';
import { TenantRole } from '../types/fenix';

export interface PersistentSessionData {
  id: string;
  tokenHash: string; // Hash SHA-256 del token aleatorio entregado al cliente
  userId: string;
  email: string;
  fullName: string;
  userType: 'SUPERADMIN' | 'TENANT_USER';
  type?: 'SUPERADMIN' | 'TENANT_USER';
  tenantId?: string; // Solo presente en usuarios de organizaciones
  role?: TenantRole;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
  expiresAt: number; // Marca de tiempo en milisegundos
  createdAt: number;
  lastActiveAt: number;
}

export type AuthSession = PersistentSessionData;

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax';
  path: string;
  maxAge: number; // en segundos
}

export const SESSION_DURATION_HOURS = 24;
export const COOKIE_NAME_TENANT = 'fenix_session';
export const COOKIE_NAME_SUPERADMIN = 'fenix_root_session';

/**
 * Genera un token de sesión aleatorio criptográficamente seguro (256 bits de entropía).
 */
export function generateRawSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Aplica hash criptográfico SHA-256 al token de sesión.
 * Solo el hash se persiste en la base de datos, nunca el token en texto plano.
 */
export function hashSessionToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Token de sesión no válido para computar hash.');
  }
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Configuración estricta de cookies para cabeceras HTTP Set-Cookie.
 */
export function getSessionCookieAttributes(
  cookieName: string,
  rawToken: string,
  durationHours = SESSION_DURATION_HOURS
): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: cookieName,
    value: rawToken,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: durationHours * 3600,
  };
}

/**
 * Convierte un objeto de opciones de cookie a formato de cabecera 'Set-Cookie'.
 */
export function serializeSessionCookie(options: SessionCookieOptions): string {
  const parts = [
    `${options.name}=${options.value}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite === 'strict' ? 'Strict' : 'Lax'}`,
    options.httpOnly ? 'HttpOnly' : '',
    options.secure ? 'Secure' : '',
  ].filter(Boolean);

  return parts.join('; ');
}

// ----------------------------------------------------------------------------
// REPOSITORIO DE SESIONES (COMPATIBLE CON PRISMA / MEMORIA LOCAL SANDBOX)
// ----------------------------------------------------------------------------

class SessionManager {
  private sessions = new Map<string, PersistentSessionData>(); // Clave: tokenHash

  /**
   * Registra una nueva sesión guardando únicamente el hash del token aleatorio.
   */
  public createSession(params: {
    rawToken: string;
    userId: string;
    email: string;
    fullName: string;
    userType: 'SUPERADMIN' | 'TENANT_USER';
    tenantId?: string;
    role?: TenantRole;
    ipAddress?: string;
    userAgent?: string;
    durationHours?: number;
  }): PersistentSessionData {
    const tokenHash = hashSessionToken(params.rawToken);
    const duration = params.durationHours ?? SESSION_DURATION_HOURS;
    const now = Date.now();
    const expiresAt = now + duration * 3600 * 1000;

    const session: PersistentSessionData = {
      id: `sess_${now}_${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      userId: params.userId,
      email: params.email,
      fullName: params.fullName,
      userType: params.userType,
      tenantId: params.tenantId,
      role: params.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
    };

    this.sessions.set(tokenHash, session);
    return session;
  }

  /**
   * Valida un token aleatorio en el servidor.
   * Computa el hash SHA-256 del token recibido y comprueba su estado, expiración y tipo de acceso.
   */
  public validateSession(
    rawToken: string | null | undefined,
    expectedType?: 'SUPERADMIN' | 'TENANT_USER'
  ): {
    isValid: boolean;
    session?: PersistentSessionData;
    error?: string;
  } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { isValid: false, error: 'Token de sesión ausente' };
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = this.sessions.get(tokenHash);

    if (!session) {
      return { isValid: false, error: 'Sesión no encontrada o token inválido' };
    }

    if (session.isRevoked) {
      return { isValid: false, error: 'La sesión ha sido revocada' };
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      return { isValid: false, error: 'La sesión ha expirado' };
    }

    if (expectedType && session.userType !== expectedType) {
      return { isValid: false, error: 'Tipo de acceso no autorizado para esta sesión' };
    }

    // Actualizar actividad
    session.lastActiveAt = now;
    return { isValid: true, session };
  }

  /**
   * Revoca una sesión específica (logout).
   */
  public revokeSession(rawToken: string): boolean {
    try {
      const tokenHash = hashSessionToken(rawToken);
      const session = this.sessions.get(tokenHash);
      if (session) {
        session.isRevoked = true;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Revoca todas las sesiones de un usuario (por ejemplo, tras cambiar la contraseña).
   * Opcionalmente preserva la sesión actual.
   */
  public revokeAllUserSessions(userId: string, preserveCurrentRawToken?: string): number {
    let currentHashToPreserve: string | null = null;
    if (preserveCurrentRawToken) {
      try {
        currentHashToPreserve = hashSessionToken(preserveCurrentRawToken);
      } catch {
        // Ignorar si el token a preservar no era válido
      }
    }

    let revokedCount = 0;
    for (const [hash, session] of this.sessions.entries()) {
      if (session.userId === userId && !session.isRevoked) {
        if (currentHashToPreserve && hash === currentHashToPreserve) {
          continue; // Preservar la sesión actual
        }
        session.isRevoked = true;
        revokedCount++;
      }
    }
    return revokedCount;
  }

  /**
   * Lista sesiones activas de un usuario (útil para auditoría).
   */
  public getUserActiveSessions(userId: string): PersistentSessionData[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && !s.isRevoked && s.expiresAt > now
    );
  }

  /**
   * Limpia sesiones expiradas o revocadas.
   */
  public cleanupExpired(): void {
    const now = Date.now();
    for (const [hash, session] of this.sessions.entries()) {
      if (session.isRevoked || session.expiresAt <= now) {
        this.sessions.delete(hash);
      }
    }
  }
}

export const sessionManager = new SessionManager();
