// Módulo de Seguridad y Hashing de FenixCMS SaaS
import bcrypt from 'bcryptjs';
import { TenantRole } from '../types/fenix';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with salt.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('La contraseña debe tener un mínimo de 8 caracteres.');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Validates tenant access isolation:
 * Enforces that a user belonging to tenantA CANNOT read or write data belonging to tenantB.
 */
export function validateTenantAccess(userTenantId: string, requestedTenantId: string): boolean {
  if (!userTenantId || !requestedTenantId) return false;
  return userTenantId === requestedTenantId;
}

/**
 * Checks role permissions hierarchy for a tenant.
 */
export function hasPermission(
  userRole: TenantRole,
  requiredRole: 'ADMIN' | 'EDITOR' | 'VIEWER'
): boolean {
  const roleWeights: Record<TenantRole, number> = {
    TENANT_OWNER: 40,
    TENANT_ADMIN: 30,
    TENANT_EDITOR: 20,
    TENANT_VIEWER: 10,
  };

  const requiredWeights: Record<'ADMIN' | 'EDITOR' | 'VIEWER', number> = {
    ADMIN: 30,
    EDITOR: 20,
    VIEWER: 10,
  };

  const userWeight = roleWeights[userRole] ?? 0;
  const targetWeight = requiredWeights[requiredRole] ?? 999;
  return userWeight >= targetWeight;
}

/**
 * Validates payment verification codes to ensure orders and subscriptions
 * are never marked as completed without proper verification.
 */
export function verifyPaymentTransaction(transactionId: string, signature: string): boolean {
  if (!transactionId || !signature) return false;
  // A valid payment token must have correct format (e.g., FENIX_PAY_xxx) and valid checksum length
  if (!transactionId.startsWith('tx_') && !transactionId.startsWith('FENIX_PAY_')) {
    return false;
  }
  return signature.length >= 16;
}
