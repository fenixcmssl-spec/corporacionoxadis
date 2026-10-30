// ============================================================================
// FENIXCMS SAAS — GESTOR DE SESIONES Y TOKENS CRIPTOGRÁFICOS
// FASE 1.4: SESIONES PERSISTENTES, TOKENS HASHEADOS Y COOKIES SEGURAS
// ============================================================================

import crypto from 'crypto';
import { TenantRole } from '../types/fenix';
import { prisma, executeWithDatabase } from '../db/prisma';

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
// REPOSITORIO DE SESIONES PERSISTENTES (PRISMA POSTGRESQL + CACHÉ SEGURA)
// ----------------------------------------------------------------------------

class SessionManager {
  private sessions = new Map<string, PersistentSessionData>(); // Clave: tokenHash

  /**
   * Registra una nueva sesión persistente en PostgreSQL guardando únicamente el hash SHA-256.
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

    // Intento asíncrono no bloqueante de persistencia en PostgreSQL
    this.persistSessionToDb(session).catch(() => {
      // Si la base de datos no está disponible, se preserva en la caché local segura
    });

    return session;
  }

  /**
   * Versión asíncrona explícita para registrar la sesión directamente en Prisma.
   */
  public async createSessionAsync(params: Parameters<SessionManager['createSession']>[0]): Promise<PersistentSessionData> {
    const session = this.createSession(params);
    await this.persistSessionToDb(session).catch(() => {
      // Tolera fallo de conexión en entornos aislados
    });
    return session;
  }

  private async persistSessionToDb(session: PersistentSessionData): Promise<void> {
    try {
      await executeWithDatabase(async () => {
        return prisma.session.create({
          data: {
            sessionToken: session.tokenHash,
            userId: session.userId,
            ipAddress: session.ipAddress || null,
            userAgent: session.userAgent || null,
            isRevoked: session.isRevoked,
            expiresAt: new Date(session.expiresAt),
          },
        });
      });
    } catch {
      // El fallo se gestiona manteniendo la sesión en memoria
    }
  }

  /**
   * Valida un token de sesión de manera asíncrona comprobando PostgreSQL con Prisma.
   */
  public async validateSessionAsync(
    rawToken: string | null | undefined,
    expectedType?: 'SUPERADMIN' | 'TENANT_USER'
  ): Promise<{
    isValid: boolean;
    session?: PersistentSessionData;
    error?: string;
  }> {
    if (!rawToken || typeof rawToken !== 'string') {
      return { isValid: false, error: 'Token de sesión ausente' };
    }

    const tokenHash = hashSessionToken(rawToken);

    // 1. Intentar validar contra base de datos PostgreSQL
    try {
      const dbSession = await executeWithDatabase(async () => {
        return prisma.session.findUnique({
          where: { sessionToken: tokenHash },
          include: {
            user: {
              include: {
                roles: {
                  include: { role: true },
                },
              },
            },
          },
        });
      });

      if (dbSession) {
        if (dbSession.isRevoked) {
          return { isValid: false, error: 'La sesión ha sido revocada' };
        }

        const now = Date.now();
        if (now > dbSession.expiresAt.getTime()) {
          return { isValid: false, error: 'La sesión ha expirado' };
        }

        const user = dbSession.user;
        if (user.status !== 'ACTIVE') {
          return { isValid: false, error: 'La cuenta de usuario no está activa' };
        }

        const userType = user.userType === 'SUPERADMIN' ? 'SUPERADMIN' : 'TENANT_USER';
        if (expectedType && userType !== expectedType) {
          return { isValid: false, error: 'Tipo de acceso no autorizado para esta sesión' };
        }

        // Mapear rol si existe
        let role: TenantRole | undefined;
        if (user.roles && user.roles.length > 0) {
          const roleSlug = user.roles[0].role.slug;
          if (roleSlug === 'owner' || roleSlug === 'admin') role = 'TENANT_OWNER';
          else if (roleSlug === 'editor') role = 'TENANT_EDITOR';
          else role = 'TENANT_VIEWER';
        }

        const persistentData: PersistentSessionData = {
          id: dbSession.id,
          tokenHash: dbSession.sessionToken,
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          userType,
          tenantId: user.tenantId || undefined,
          role,
          ipAddress: dbSession.ipAddress || undefined,
          userAgent: dbSession.userAgent || undefined,
          isRevoked: dbSession.isRevoked,
          expiresAt: dbSession.expiresAt.getTime(),
          createdAt: dbSession.createdAt.getTime(),
          lastActiveAt: now,
        };

        // Actualizar actividad en DB de fondo
        prisma.session.update({
          where: { id: dbSession.id },
          data: { lastActiveAt: new Date(now) },
        }).catch(() => {});

        // Sincronizar en caché local
        this.sessions.set(tokenHash, persistentData);

        return { isValid: true, session: persistentData };
      }
    } catch {
      // Si PostgreSQL no está conectado, cae en la validación local segura
    }

    // 2. Fallback a validación local sincronizada
    return this.validateSession(rawToken, expectedType);
  }

  /**
   * Valida un token aleatorio en el servidor de forma síncrona (compatible con middleware/tests).
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
   * Revoca una sesión específica (logout) en PostgreSQL y memoria.
   */
  public revokeSession(rawToken: string): boolean {
    try {
      const tokenHash = hashSessionToken(rawToken);
      const session = this.sessions.get(tokenHash);
      if (session) {
        session.isRevoked = true;
      }

      // Persistir revocación en PostgreSQL
      executeWithDatabase(async () => {
        return prisma.session.updateMany({
          where: { sessionToken: tokenHash },
          data: { isRevoked: true },
        });
      }).catch(() => {});

      return true;
    } catch {
      return false;
    }
  }

  public async revokeSessionAsync(rawToken: string): Promise<boolean> {
    const success = this.revokeSession(rawToken);
    try {
      const tokenHash = hashSessionToken(rawToken);
      await executeWithDatabase(async () => {
        return prisma.session.updateMany({
          where: { sessionToken: tokenHash },
          data: { isRevoked: true },
        });
      });
    } catch {
      // Ignorar si PostgreSQL está desconectado
    }
    return success;
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

    // Persistir revocación masiva en PostgreSQL
    executeWithDatabase(async () => {
      return prisma.session.updateMany({
        where: {
          userId,
          ...(currentHashToPreserve ? { sessionToken: { not: currentHashToPreserve } } : {}),
        },
        data: { isRevoked: true },
      });
    }).catch(() => {});

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

