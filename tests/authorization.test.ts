import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_PERMISSIONS,
  roleHasPermission,
  isSuperAdminRole,
  getDefaultRoleForNewUser,
  AppRole,
} from '../lib/security/roles';
import {
  requireSuperAdmin,
  enforceTenantOwnership,
  SecurityContext,
  TenantIsolationViolationError,
  ForbiddenAccessError,
  AuthenticationRequiredError,
} from '../lib/security/authorization';
import { tenantIsolatedService } from '../lib/services/tenant-isolated.service';
import { securityAudit, sanitizeAuditMetadata } from '../lib/security/audit';

// Helper para crear contextos de seguridad de prueba
function createMockContext(params: {
  userId: string;
  email: string;
  userType: 'SUPERADMIN' | 'TENANT_USER';
  tenantId?: string;
  role: AppRole;
}): SecurityContext {
  return {
    userId: params.userId,
    email: params.email,
    userType: params.userType,
    tenantId: params.tenantId,
    role: params.role,
    session: {
      id: `sess_${params.userId}`,
      tokenHash: 'hash_test',
      userId: params.userId,
      email: params.email,
      fullName: 'Test User',
      userType: params.userType,
      tenantId: params.tenantId,
      isRevoked: false,
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    },
  };
}

test('RBAC Matrix: Verifies allowed and denied permissions per logical role', () => {
  // 1. SUPERADMIN
  assert.equal(roleHasPermission('SUPERADMIN', 'platform:admin'), true);
  assert.equal(roleHasPermission('SUPERADMIN', 'platform:licenses:manage'), true);
  assert.equal(isSuperAdminRole('SUPERADMIN'), true);

  // 2. SAAS_CUSTOMER
  assert.equal(roleHasPermission('SAAS_CUSTOMER', 'saas:subscription:read'), true);
  assert.equal(roleHasPermission('SAAS_CUSTOMER', 'platform:admin'), false);
  assert.equal(roleHasPermission('SAAS_CUSTOMER', 'tenant:products:write'), false);
  assert.equal(isSuperAdminRole('SAAS_CUSTOMER'), false);

  // 3. TENANT_ADMIN
  assert.equal(roleHasPermission('TENANT_ADMIN', 'tenant:products:write'), true);
  assert.equal(roleHasPermission('TENANT_ADMIN', 'tenant:domains:manage'), true);
  assert.equal(roleHasPermission('TENANT_ADMIN', 'platform:admin'), false);
  assert.equal(isSuperAdminRole('TENANT_ADMIN'), false);

  // 4. TENANT_EDITOR
  assert.equal(roleHasPermission('TENANT_EDITOR', 'tenant:products:write'), true);
  assert.equal(roleHasPermission('TENANT_EDITOR', 'tenant:domains:manage'), false); // No puede gestionar dominios
  assert.equal(roleHasPermission('TENANT_EDITOR', 'tenant:products:delete'), false);

  // 5. TENANT_VIEWER
  assert.equal(roleHasPermission('TENANT_VIEWER', 'tenant:products:read'), true);
  assert.equal(roleHasPermission('TENANT_VIEWER', 'tenant:products:write'), false); // No puede crear productos
  assert.equal(roleHasPermission('TENANT_VIEWER', 'tenant:domains:manage'), false);
});

test('Default Role Discipline: Never grants administrative privileges to new accounts', () => {
  const saasRole = getDefaultRoleForNewUser('SAAS_PORTAL');
  assert.equal(saasRole, 'SAAS_CUSTOMER');
  assert.equal(roleHasPermission(saasRole, 'platform:admin'), false);

  const tenantRole = getDefaultRoleForNewUser('TENANT_INVITATION');
  assert.equal(tenantRole, 'TENANT_VIEWER');
  assert.equal(roleHasPermission(tenantRole, 'tenant:products:write'), false);
  assert.equal(roleHasPermission(tenantRole, 'tenant:domains:manage'), false);
});

test('SuperAdmin Protection: Blocks non-superadmin accounts and unauthorized roles', () => {
  const tenantUserContext = createMockContext({
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_ADMIN',
  });

  // Intentar invocar requireSuperAdmin debe lanzar ForbiddenAccessError (403)
  assert.throws(
    () => {
      requireSuperAdmin(tenantUserContext);
    },
    (err: any) => err instanceof ForbiddenAccessError
  );

  // Intentar con contexto nulo debe lanzar AuthenticationRequiredError (401)
  assert.throws(
    () => {
      requireSuperAdmin(null);
    },
    (err: any) => err instanceof AuthenticationRequiredError
  );

  // SuperAdmin legítimo debe ser admitido
  const rootContext = createMockContext({
    userId: 'usr_root_01',
    email: 'superadmin@fenixcms.io',
    userType: 'SUPERADMIN',
    role: 'SUPERADMIN',
  });
  const authorized = requireSuperAdmin(rootContext);
  assert.equal(authorized.userType, 'SUPERADMIN');
});

test('Cross-Tenant Isolation: Tenant A cannot read or write data of Tenant B', () => {
  const contextTenantA = createMockContext({
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_ADMIN',
  });

  const contextTenantB = createMockContext({
    userId: 'usr_tech_02',
    email: 'admin@techgadgets.es',
    userType: 'TENANT_USER',
    tenantId: 'tenant_tech_02',
    role: 'TENANT_ADMIN',
  });

  // 1. Tenant A leyendo su propio catálogo: PERMITIDO
  const ownProducts = tenantIsolatedService.getProducts(contextTenantA, 'tenant_moda_01');
  assert.ok(Array.isArray(ownProducts));

  // 2. Tenant A intentando leer el catálogo de Tenant B: DENEGADO (403)
  assert.throws(
    () => {
      tenantIsolatedService.getProducts(contextTenantA, 'tenant_tech_02');
    },
    (err: any) => {
      assert.ok(err instanceof TenantIsolationViolationError);
      assert.ok(err.message.includes('tenant_tech_02'));
      return true;
    },
    'Tenant A no debe poder leer productos de Tenant B'
  );

  // 3. Tenant A intentando crear un producto en Tenant B: DENEGADO (403)
  assert.throws(
    () => {
      tenantIsolatedService.createProduct(contextTenantA, 'tenant_tech_02', {
        title: 'Intento de Inyección Cruzada',
        sku: 'HACK-01',
        price: 999,
        stock: 1,
        categoryId: 'cat_hack',
        categoryName: 'Hack',
        description: 'No autorizado',
        imageUrl: '',
        isPublished: true,
      });
    },
    (err: any) => err instanceof TenantIsolationViolationError,
    'Tenant A no debe poder escribir productos en el espacio de Tenant B'
  );

  // 4. Tenant B intentando leer los pedidos privados de Tenant A: DENEGADO (403)
  assert.throws(
    () => {
      tenantIsolatedService.getOrders(contextTenantB, 'tenant_moda_01');
    },
    (err: any) => err instanceof TenantIsolationViolationError,
    'Tenant B no debe poder consultar pedidos de Tenant A'
  );
});

test('Browser TenantId Tampering: Enforces that URL/Query tenantId cannot override session identity', () => {
  const contextTenantA = createMockContext({
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_ADMIN',
  });

  // El navegador envía tenant_tech_02 en la query o URL
  const spoofedTenantId = 'tenant_tech_02';

  assert.throws(
    () => {
      enforceTenantOwnership(contextTenantA, spoofedTenantId, 'tenant:products:read');
    },
    (err: any) => {
      assert.ok(err instanceof TenantIsolationViolationError);
      return true;
    }
  );
});

test('Security Audit Redaction: Redacts sensitive passwords, tokens, and financial secrets', () => {
  const sensitivePayload = {
    username: 'admin@modaurbana.es',
    password: 'SuperSecretPassword123!',
    token: 'raw_session_token_9999',
    creditCard: '4532-1111-2222-3333',
    cvv: '123',
    nested: {
      apiKey: 'sk_live_99999',
      legitimateInfo: 'Información no confidencial',
    },
  };

  const sanitized = sanitizeAuditMetadata(sensitivePayload);

  assert.equal(sanitized?.password, '[REDACTED_SECURE]');
  assert.equal(sanitized?.token, '[REDACTED_SECURE]');
  assert.equal(sanitized?.creditCard, '[REDACTED_SECURE]');
  assert.equal(sanitized?.cvv, '[REDACTED_SECURE]');
  assert.equal(sanitized?.nested?.apiKey, '[REDACTED_SECURE]');
  assert.equal(sanitized?.nested?.legitimateInfo, 'Información no confidencial');
  assert.equal(sanitized?.username, 'admin@modaurbana.es');
});
