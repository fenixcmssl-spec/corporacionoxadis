import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  sessionManager,
  generateRawSessionToken,
  hashSessionToken,
  COOKIE_NAME_TENANT,
  COOKIE_NAME_SUPERADMIN,
} from '../lib/auth/session';
import { authService } from '../lib/auth/auth-service';
import {
  getSecurityContextFromRequest,
  getSecurityContextFromRequestAsync,
  enforceTenantOwnership,
  TenantIsolationViolationError,
  AuthenticationRequiredError,
} from '../lib/security/authorization';
import { GET as adminGet, POST as adminPost } from '../app/api/admin/[tenantId]/[resource]/route';
import { GET as authMeGet } from '../app/api/auth/[action]/route';

// Helper para crear peticiones NextRequest con cookies de sesión seguras
function createAuthenticatedRequest(
  url: string,
  method = 'GET',
  cookieName?: string,
  rawToken?: string,
  body?: any
): NextRequest {
  const headers = new Headers();
  headers.set('host', 'localhost:3000');
  headers.set('content-type', 'application/json');

  if (cookieName && rawToken) {
    headers.set('cookie', `${cookieName}=${rawToken}`);
  }

  const reqInit: RequestInit = {
    method,
    headers,
  };

  if (body) {
    reqInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, reqInit);
}

test('Fase 2 BIS.3: El código de app/admin/page.tsx no importa repositorios de datos directos (fenixDb)', () => {
  const adminPagePath = path.join(process.cwd(), 'app/admin/page.tsx');
  const content = fs.readFileSync(adminPagePath, 'utf8');

  // Comprobar ausencia de fenixDb
  assert.equal(
    content.includes("from '../../lib/db/client'"),
    false,
    'El componente de cliente app/admin/page.tsx no debe importar lib/db/client'
  );
  assert.equal(
    content.includes('fenixDb'),
    false,
    'El componente de cliente app/admin/page.tsx no debe contener referencias a fenixDb'
  );
});

test('Fase 2 BIS.3: Rechazo controlado (HTTP 401) ante peticiones sin sesión autenticada', async () => {
  // 1. GET sin cookie a /api/admin/tenant_moda_01/products
  const unauthGetReq = createAuthenticatedRequest('http://localhost:3000/api/admin/tenant_moda_01/products', 'GET');
  const getRes = await adminGet(unauthGetReq, {
    params: Promise.resolve({ tenantId: 'tenant_moda_01', resource: 'products' }),
  });

  assert.equal(getRes.status, 401, 'Debe devolver código HTTP 401');
  const getBody = await getRes.json();
  assert.ok(getBody.error.includes('Autenticación requerida'));

  // 2. POST sin cookie a /api/admin/tenant_moda_01/products
  const unauthPostReq = createAuthenticatedRequest(
    'http://localhost:3000/api/admin/tenant_moda_01/products',
    'POST',
    undefined,
    undefined,
    {
      title: 'Producto No Autorizado',
      sku: 'NOAUTH-01',
      price: 50.0,
      stock: 5,
    }
  );
  const postRes = await adminPost(unauthPostReq, {
    params: Promise.resolve({ tenantId: 'tenant_moda_01', resource: 'products' }),
  });

  assert.equal(postRes.status, 401, 'Debe devolver código HTTP 401');
  const postBody = await postRes.json();
  assert.ok(postBody.error.includes('Autenticación requerida'));
});

test('Fase 2 BIS.3: Consulta y creación de producto mediante API protegida para usuario autorizado', async () => {
  // Crear sesión de usuario legítimo de tenant_moda_01
  const rawToken = generateRawSessionToken();
  sessionManager.createSession({
    rawToken,
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    fullName: 'Roberto Fénix',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_OWNER',
  });

  // 1. Consulta GET a su catálogo
  const authGetReq = createAuthenticatedRequest(
    'http://localhost:3000/api/admin/tenant_moda_01/products',
    'GET',
    COOKIE_NAME_TENANT,
    rawToken
  );
  const getRes = await adminGet(authGetReq, {
    params: Promise.resolve({ tenantId: 'tenant_moda_01', resource: 'products' }),
  });

  assert.equal(getRes.status, 200, 'Debe devolver 200 OK para el tenant propietario');
  const getBody = await getRes.json();
  assert.equal(getBody.success, true);
  assert.equal(getBody.tenantId, 'tenant_moda_01');
  assert.ok(Array.isArray(getBody.products));

  // 2. Creación POST de un nuevo producto
  const uniqueSku = `PRD-BIS3-${Date.now()}`;
  const authPostReq = createAuthenticatedRequest(
    'http://localhost:3000/api/admin/tenant_moda_01/products',
    'POST',
    COOKIE_NAME_TENANT,
    rawToken,
    {
      title: 'Chaqueta Impermeable Pro',
      sku: uniqueSku,
      price: 129.99,
      stock: 25,
      categoryName: 'Prendas Técnicas',
      description: 'Chaqueta creada mediante endpoint protegido con validación de sesión.',
    }
  );

  const postRes = await adminPost(authPostReq, {
    params: Promise.resolve({ tenantId: 'tenant_moda_01', resource: 'products' }),
  });

  assert.equal(postRes.status, 201, 'Debe devolver 201 Created');
  const postBody = await postRes.json();
  assert.equal(postBody.success, true);
  assert.equal(postBody.product.sku, uniqueSku);
  assert.equal(postBody.product.title, 'Chaqueta Impermeable Pro');
});

test('Fase 2 BIS.3: Rechazo de usuario que intenta acceder a un tenant ajeno (HTTP 403 Forbidden)', async () => {
  // Usuario autenticado de Moda Urbana (tenant_moda_01)
  const rawTokenModa = generateRawSessionToken();
  sessionManager.createSession({
    rawToken: rawTokenModa,
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    fullName: 'Roberto Fénix',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_OWNER',
  });

  // 1. Intento de GET a tenant_tech_02 (Tech Gadgets)
  const crossGetReq = createAuthenticatedRequest(
    'http://localhost:3000/api/admin/tenant_tech_02/products',
    'GET',
    COOKIE_NAME_TENANT,
    rawTokenModa
  );

  const getRes = await adminGet(crossGetReq, {
    params: Promise.resolve({ tenantId: 'tenant_tech_02', resource: 'products' }),
  });

  assert.equal(getRes.status, 403, 'Debe devolver 403 Forbidden por violación de aislamiento');
  const getBody = await getRes.json();
  assert.ok(getBody.error.includes('Aislamiento de Tenant Violado') || getBody.error.includes('Acceso no autorizado'));

  // 2. Intento de POST para inyectar producto en tenant_tech_02
  const crossPostReq = createAuthenticatedRequest(
    'http://localhost:3000/api/admin/tenant_tech_02/products',
    'POST',
    COOKIE_NAME_TENANT,
    rawTokenModa,
    {
      title: 'Producto Infiltrado',
      sku: 'HACK-99',
      price: 1.0,
      stock: 1,
    }
  );

  const postRes = await adminPost(crossPostReq, {
    params: Promise.resolve({ tenantId: 'tenant_tech_02', resource: 'products' }),
  });

  assert.equal(postRes.status, 403, 'Debe denegar la creación de productos en tenant ajeno con 403');
  const postBody = await postRes.json();
  assert.ok(postBody.error.includes('Aislamiento de Tenant Violado') || postBody.error.includes('Acceso no autorizado'));
});

test('Fase 2 BIS.3: Tokens de sesión hasheados con SHA-256 y ciclo de vida de revocación', () => {
  const rawToken = generateRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  // El token aleatorio y su hash no son idénticos
  assert.notEqual(rawToken, tokenHash);
  assert.equal(tokenHash.length, 64, 'El hash SHA-256 debe tener 64 caracteres hexadecimales');

  // Crear sesión y validar
  const session = sessionManager.createSession({
    rawToken,
    userId: 'usr_audit_01',
    email: 'auditor@modaurbana.es',
    fullName: 'Auditor de Seguridad',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
  });

  assert.equal(session.tokenHash, tokenHash, 'La sesión almacena el tokenHash y no el rawToken plano');

  // Validación positiva inicial
  const validCheck = sessionManager.validateSession(rawToken, 'TENANT_USER');
  assert.equal(validCheck.isValid, true);

  // Revocación de sesión (Logout)
  const revoked = sessionManager.revokeSession(rawToken);
  assert.equal(revoked, true);

  // Validación posterior debe fallar
  const postRevoke = sessionManager.validateSession(rawToken, 'TENANT_USER');
  assert.equal(postRevoke.isValid, false);
  assert.ok(postRevoke.error?.includes('revocada'));
});

test('Fase 2 BIS.3: Endpoint /api/auth/me devuelve datos de sesión y tenantId autorizados', async () => {
  const rawToken = generateRawSessionToken();
  sessionManager.createSession({
    rawToken,
    userId: 'usr_moda_01',
    email: 'admin@modaurbana.es',
    fullName: 'Roberto Fénix',
    userType: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_OWNER',
  });

  const meReq = createAuthenticatedRequest(
    'http://localhost:3000/api/auth/me',
    'GET',
    COOKIE_NAME_TENANT,
    rawToken
  );

  const meRes = await authMeGet(meReq, {
    params: Promise.resolve({ action: 'me' }),
  });

  assert.equal(meRes.status, 200);
  const meBody = await meRes.json();
  assert.equal(meBody.authenticated, true);
  assert.equal(meBody.user.id, 'usr_moda_01');
  assert.equal(meBody.user.tenantId, 'tenant_moda_01');
  assert.equal(meBody.user.userType, 'TENANT_USER');
});
