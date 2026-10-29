// ============================================================================
// FENIXCMS SAAS — MATRIZ DE ROLES Y PERMISOS (RBAC)
// FASE 1.5: ROLES LÓGICOS, PERMISOS GRANULARES Y ASIGNACIÓN SEGURA
// ============================================================================

export type AppRole =
  | 'SUPERADMIN'        // Administra la plataforma completa (Root)
  | 'SAAS_CUSTOMER'     // Cliente de la plataforma SaaS (suscripción, licencias, facturación)
  | 'TENANT_ADMIN'      // Administrador total del espacio de su tenant
  | 'TENANT_EDITOR'     // Editor de contenido y catálogo dentro de su tenant
  | 'TENANT_VIEWER';    // Observador de solo lectura dentro de su tenant

export type Permission =
  // Permisos Globales de Plataforma
  | 'platform:admin'
  | 'platform:metrics'
  | 'platform:tenants:manage'
  | 'platform:licenses:manage'
  | 'platform:plans:manage'
  | 'platform:audit:read'
  | 'platform:settings:write'

  // Permisos de Cliente SaaS
  | 'saas:account:read'
  | 'saas:subscription:read'
  | 'saas:subscription:manage'
  | 'saas:billing:read'
  | 'saas:licenses:read'

  // Permisos de Tenant
  | 'tenant:settings:manage'
  | 'tenant:domains:manage'
  | 'tenant:users:manage'
  | 'tenant:themes:manage'
  | 'tenant:plugins:manage'
  | 'tenant:products:read'
  | 'tenant:products:write'
  | 'tenant:products:delete'
  | 'tenant:orders:read'
  | 'tenant:orders:manage'
  | 'tenant:pages:read'
  | 'tenant:pages:write'
  | 'tenant:pages:delete';

/**
 * Matriz de permisos asignados a cada rol lógico del sistema.
 */
export const ROLE_PERMISSIONS: Record<AppRole, Set<Permission>> = {
  SUPERADMIN: new Set<Permission>([
    'platform:admin',
    'platform:metrics',
    'platform:tenants:manage',
    'platform:licenses:manage',
    'platform:plans:manage',
    'platform:audit:read',
    'platform:settings:write',
    'tenant:products:read',
    'tenant:orders:read',
    'tenant:pages:read',
  ]),

  SAAS_CUSTOMER: new Set<Permission>([
    'saas:account:read',
    'saas:subscription:read',
    'saas:subscription:manage',
    'saas:billing:read',
    'saas:licenses:read',
  ]),

  TENANT_ADMIN: new Set<Permission>([
    'tenant:settings:manage',
    'tenant:domains:manage',
    'tenant:users:manage',
    'tenant:themes:manage',
    'tenant:plugins:manage',
    'tenant:products:read',
    'tenant:products:write',
    'tenant:products:delete',
    'tenant:orders:read',
    'tenant:orders:manage',
    'tenant:pages:read',
    'tenant:pages:write',
    'tenant:pages:delete',
  ]),

  TENANT_EDITOR: new Set<Permission>([
    'tenant:products:read',
    'tenant:products:write',
    'tenant:orders:read',
    'tenant:orders:manage',
    'tenant:pages:read',
    'tenant:pages:write',
  ]),

  TENANT_VIEWER: new Set<Permission>([
    'tenant:products:read',
    'tenant:orders:read',
    'tenant:pages:read',
  ]),
};

/**
 * Comprueba si un rol específico tiene un permiso determinado.
 */
export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.has(permission);
}

/**
 * Comprueba si un usuario tiene un rol que le permite acceder al panel SuperAdmin.
 * REGLA ESTRICTA: Solo 'SUPERADMIN' expresamente autorizado.
 */
export function isSuperAdminRole(role?: string | null): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Define el rol por defecto seguro para nuevos usuarios.
 * REGLA DE SEGURIDAD: Nunca asignar roles administrativos por defecto a cuentas nuevas.
 */
export function getDefaultRoleForNewUser(userContext: 'SAAS_PORTAL' | 'TENANT_INVITATION'): AppRole {
  if (userContext === 'SAAS_PORTAL') {
    return 'SAAS_CUSTOMER'; // Rol básico de cliente sin privilegios administrativos sobre la plataforma
  }
  return 'TENANT_VIEWER'; // Rol mínimo de lectura dentro de una tienda invitada
}
