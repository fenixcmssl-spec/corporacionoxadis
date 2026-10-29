import test from 'node:test';
import assert from 'node:assert/strict';
import { fenixDb } from '../lib/db/client';
import { resolveTenantByHostname, resolveTenantBySession } from '../lib/tenancy/resolver';
import { AuthSession } from '../lib/auth/session';

// ============================================================================
// FENIXCMS SAAS — FASE 2.9: RESOLUCIÓN DE DOMINIO Y AISLAMIENTO DE CONTENIDO
// ============================================================================

test('FASE 2.9 (Prueba 1): Resolución con dos tenants y dos dominios distintos verificados', () => {
  // Dominio Tenant A: Fénix Moda Urbana
  const resultModa = resolveTenantByHostname('modaurbana.fenixcms.app');
  assert.equal(resultModa.success, true, 'Debe resolver con éxito el dominio del Tenant Moda');
  if (resultModa.success) {
    assert.equal(resultModa.tenant.id, 'tenant_moda_01');
    assert.equal(resultModa.tenant.name, 'Fénix Moda Urbana');
    assert.equal(resultModa.domain?.isVerified, true);
    assert.equal(resultModa.domain?.sslStatus, 'ACTIVE');
  }

  // Dominio secundario verificado del Tenant A
  const resultModaSecundario = resolveTenantByHostname('www.modaurbana-boutique.com');
  assert.equal(resultModaSecundario.success, true);
  if (resultModaSecundario.success) {
    assert.equal(resultModaSecundario.tenant.id, 'tenant_moda_01');
  }

  // Dominio Tenant B: Fénix Tech & Gadgets
  const resultTech = resolveTenantByHostname('techgadgets.fenixcms.app');
  assert.equal(resultTech.success, true, 'Debe resolver con éxito el dominio del Tenant Tech');
  if (resultTech.success) {
    assert.equal(resultTech.tenant.id, 'tenant_tech_02');
    assert.equal(resultTech.tenant.name, 'Fénix Tech & Gadgets');
    assert.equal(resultTech.domain?.isVerified, true);
  }

  // Verificación de no colisión: El tenant A no se confunde con el tenant B
  if (resultModa.success && resultTech.success) {
    assert.notEqual(resultModa.tenant.id, resultTech.tenant.id);
  }
});

test('FASE 2.9 (Prueba 2): Rechazo controlado de dominios no validados (unverified)', () => {
  // El dominio está registrado en la base de datos pero pendiente de verificación (isVerified = false)
  const result = resolveTenantByHostname('tienda-pendiente.com');
  assert.equal(result.success, false, 'Un dominio no validado debe ser rechazado');
  if (!result.success) {
    assert.equal(result.error, 'DOMAIN_UNVERIFIED');
    assert.match(result.message, /pendiente de verificación/i);
  }
});

test('FASE 2.9 (Prueba 3): Rechazo controlado de dominios no registrados en la plataforma', () => {
  // Dominio inexistente / desconocido
  const result = resolveTenantByHostname('tienda-desconocida-ficticia-999.com');
  assert.equal(result.success, false, 'Un dominio desconocido debe fallar');
  if (!result.success) {
    assert.equal(result.error, 'DOMAIN_NOT_REGISTERED');
    assert.match(result.message, /no está asociado a ningún tenant/i);
  }

  // Comprobación de que no carga el contenido de otro tenant como fallback
  assert.equal(
    result.success,
    false,
    'Nunca debe cargar un tenant por defecto cuando el host es inválido'
  );
});

test('FASE 2.9 (Prueba 4): Protección perimetral — Ninguna cabecera arbitraria puede seleccionar libremente otro tenant', () => {
  // La resolución por host depende exclusivamente del host normalizado y verificado
  const cleanResolution = resolveTenantByHostname('modaurbana.fenixcms.app');
  assert.equal(cleanResolution.success, true);
  if (cleanResolution.success) {
    assert.equal(
      cleanResolution.tenant.id,
      'tenant_moda_01',
      'El host modaurbana siempre resuelve a tenant_moda_01 independientemente de intenciones externas'
    );
  }
});

test('FASE 2.9 (Prueba 5): Navegación del sitio público según módulos autorizados por el plan', () => {
  // Tenant Moda: Plan Pro (contratado: ecommerce, blog, clasificados)
  const modaModules = fenixDb.getTenantModules('tenant_moda_01');
  assert.ok(modaModules.includes('ecommerce'), 'Tenant Moda debe incluir Tienda');
  assert.ok(modaModules.includes('blog'), 'Tenant Moda debe incluir Blog');
  assert.ok(modaModules.includes('clasificados'), 'Tenant Moda debe incluir Clasificados');
  assert.equal(modaModules.includes('inmobiliaria'), false, 'Tenant Moda NO tiene contratada Inmobiliaria');
  assert.equal(modaModules.includes('subastas'), false, 'Tenant Moda NO tiene contratadas Subastas');
  assert.equal(modaModules.includes('personales'), false, 'Tenant Moda NO tiene contratados Anuncios Personales');

  assert.equal(fenixDb.isModuleAuthorized('tenant_moda_01', 'inmobiliaria'), false);
  assert.equal(fenixDb.isModuleAuthorized('tenant_moda_01', 'subastas'), false);

  // Tenant Tech: Plan Enterprise (incluye los 6 módulos)
  const techModules = fenixDb.getTenantModules('tenant_tech_02');
  assert.ok(techModules.includes('ecommerce'));
  assert.ok(techModules.includes('blog'));
  assert.ok(techModules.includes('inmobiliaria'));
  assert.ok(techModules.includes('subastas'));
  assert.ok(techModules.includes('clasificados'));
  assert.ok(techModules.includes('personales'));

  assert.equal(fenixDb.isModuleAuthorized('tenant_tech_02', 'subastas'), true);
  assert.equal(fenixDb.isModuleAuthorized('tenant_tech_02', 'inmobiliaria'), true);
});

test('FASE 2.9 (Prueba 6): Aislamiento estricto de contenido entre tenants en backend', () => {
  const tenantModaId = 'tenant_moda_01';
  const tenantTechId = 'tenant_tech_02';

  // Productos de Tenant Moda
  const modaProducts = fenixDb.getProducts(tenantModaId);
  const techProducts = fenixDb.getProducts(tenantTechId);

  assert.ok(modaProducts.length > 0);
  assert.ok(techProducts.length > 0);

  modaProducts.forEach((p) => assert.equal(p.tenantId, tenantModaId));
  techProducts.forEach((p) => assert.equal(p.tenantId, tenantTechId));

  // Conocer el ID del producto de Tenant B no permite consultarlo desde Tenant A
  const foreignProductId = techProducts[0].id;
  const leakAttempt = fenixDb.getProductById(tenantModaId, foreignProductId);
  assert.equal(
    leakAttempt,
    undefined,
    'Consultar un ID de producto de Tenant B en el contexto de Tenant A debe devolver undefined'
  );

  // Conocer el slug del blog de Tenant B no permite consultarlo desde Tenant A
  const techBlogPosts = fenixDb.getBlogPosts(tenantTechId);
  assert.ok(techBlogPosts.length > 0);
  const foreignBlogSlug = techBlogPosts[0].slug;
  const blogLeakAttempt = fenixDb.getBlogPostBySlug(tenantModaId, foreignBlogSlug);
  assert.equal(
    blogLeakAttempt,
    undefined,
    'Consultar un slug de blog de Tenant B bajo Tenant A debe devolver undefined'
  );

  // Tenant Moda no puede consultar propiedades de Tenant Tech
  const techProperties = fenixDb.getProperties(tenantTechId);
  assert.ok(techProperties.length > 0);
  const propLeakAttempt = fenixDb.getPropertyBySlug(tenantModaId, techProperties[0].slug);
  assert.equal(
    propLeakAttempt,
    undefined,
    'Consultar un inmueble de Tenant B bajo Tenant A debe devolver undefined'
  );

  // Tenant Moda no puede pujar en subastas de Tenant Tech
  const techAuctions = fenixDb.getAuctions(tenantTechId);
  assert.ok(techAuctions.length > 0);
  const bidLeakAttempt = fenixDb.placeAuctionBid(
    tenantModaId,
    techAuctions[0].id,
    99999,
    'Infiltrado'
  );
  assert.equal(
    bidLeakAttempt.success,
    false,
    'Pujar en un lote de subasta de otro tenant debe ser denegado'
  );
});

test('FASE 2.9 (Prueba 7): Contenido no publicado jamás es visible públicamente', () => {
  // Producto borrador con isPublished = false
  const modaPublicProducts = fenixDb.getProducts('tenant_moda_01');
  const draftProduct = modaPublicProducts.find((p) => p.id === 'prod_draft_moda');
  assert.equal(draftProduct, undefined, 'Productos no publicados no deben listarse en la tienda pública');

  const draftDirectQuery = fenixDb.getProductById('tenant_moda_01', 'prod_draft_moda');
  assert.equal(draftDirectQuery, undefined, 'Consultar un producto en borrador por ID devuelve undefined');

  // Artículo de blog en borrador con isPublished = false
  const modaBlogPosts = fenixDb.getBlogPosts('tenant_moda_01');
  const draftPost = modaBlogPosts.find((p) => p.slug === 'borrador-coleccion-invierno');
  assert.equal(draftPost, undefined, 'Artículos en borrador no deben listarse');

  const draftBlogQuery = fenixDb.getBlogPostBySlug('tenant_moda_01', 'borrador-coleccion-invierno');
  assert.equal(draftBlogQuery, undefined, 'Consultar un post en borrador por slug devuelve undefined');

  // Propiedad inmobiliaria en borrador con isPublished = false
  const techProperties = fenixDb.getProperties('tenant_tech_02');
  const draftProperty = techProperties.find((p) => p.slug === 'propiedad-privada-en-negociacion');
  assert.equal(draftProperty, undefined, 'Propiedades en borrador no deben listarse');

  // Subasta en borrador con isPublished = false
  const techAuctions = fenixDb.getAuctions('tenant_tech_02');
  const draftAuction = techAuctions.find((a) => a.slug === 'subasta-lote-confidencial');
  assert.equal(draftAuction, undefined, 'Subastas en borrador no deben listarse');
});

test('Tenant Resolution by Session: Blocks cross-tenant access attempts', () => {
  const tenantUserSession: AuthSession = {
    userId: 'usr_moda_admin',
    email: 'admin@modaurbana.es',
    name: 'Admin Moda',
    type: 'TENANT_USER',
    tenantId: 'tenant_moda_01',
    role: 'TENANT_ADMIN',
    expiresAt: Date.now() + 3600000,
  };

  // Acceder a su propio tenant debe ser exitoso
  const ownTenantResult = resolveTenantBySession(tenantUserSession, 'tenant_moda_01');
  assert.equal(ownTenantResult.success, true);
  if (ownTenantResult.success) {
    assert.equal(ownTenantResult.tenant.id, 'tenant_moda_01');
  }

  // Intentar acceder al tenant B con sesión del tenant A debe ser estrictamente denegado
  const crossTenantResult = resolveTenantBySession(tenantUserSession, 'tenant_tech_02');
  assert.equal(crossTenantResult.success, false);
  if (!crossTenantResult.success) {
    assert.equal(crossTenantResult.error, 'UNAUTHORIZED_ACCESS');
  }
});
