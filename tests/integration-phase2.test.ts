import test from 'node:test';
import assert from 'node:assert/strict';
import { fenixDb } from '../lib/db/client';
import {
  requireSuperAdmin,
  enforceTenantOwnership,
  AuthenticationRequiredError,
  ForbiddenAccessError,
  TenantIsolationViolationError,
  SecurityContext,
} from '../lib/security/authorization';
import { tenantIsolatedService } from '../lib/services/tenant-isolated.service';
import { resolveTenantByHostname } from '../lib/tenancy/resolver';
import {
  orderCreationSchema,
  productSchema,
  auctionBidSchema,
  validateUploadedFile,
} from '../lib/security/validators';
import { checkDatabaseHealth, assertProductionPersistenceReady } from '../lib/db/prisma';

// Helper de contexto de seguridad para pruebas
function createMockContext(
  userType: 'SUPERADMIN' | 'TENANT_USER',
  tenantId?: string,
  role: any = 'TENANT_ADMIN'
): SecurityContext {
  return {
    userId: `user_test_${Date.now()}`,
    email: 'test@fenixcms.app',
    userType,
    tenantId,
    role,
    session: {
      sessionId: 'sess_test',
      userId: 'user_test',
      email: 'test@fenixcms.app',
      userType,
      tenantId,
      role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    },
  };
}

// ============================================================================
// 1. AISLAMIENTO ESTRICTO CROSS-TENANT (LECTURA Y ESCRITURA)
// ============================================================================
test('Seguridad 2.1: Un tenant no puede leer ni modificar los datos de otro tenant', () => {
  const contextTenantA = createMockContext('TENANT_USER', 'tenant_moda_01', 'TENANT_ADMIN');
  const targetTenantB = 'tenant_tech_02';

  // Intento de lectura de productos
  assert.throws(
    () => {
      tenantIsolatedService.getProducts(contextTenantA, targetTenantB);
    },
    (err: any) => err instanceof TenantIsolationViolationError
  );

  // Intento de creación de producto en tenant ajeno
  assert.throws(
    () => {
      tenantIsolatedService.createProduct(contextTenantA, targetTenantB, {
        title: 'Producto Malicioso',
        sku: 'HACK-01',
        price: 99,
        stock: 10,
        categoryId: 'cat_test',
        categoryName: 'Hack',
        description: 'No autorizado',
        imageUrl: 'https://example.com/bad.png',
        isPublished: true,
      });
    },
    (err: any) => err instanceof TenantIsolationViolationError
  );

  // Intento de lectura de pedidos ajenos
  assert.throws(
    () => {
      tenantIsolatedService.getOrders(contextTenantA, targetTenantB);
    },
    (err: any) => err instanceof TenantIsolationViolationError
  );

  // Intento de enlazar dominio en tenant ajeno
  assert.throws(
    () => {
      tenantIsolatedService.addDomain(contextTenantA, targetTenantB, 'evil-takeover.com');
    },
    (err: any) => err instanceof TenantIsolationViolationError
  );
});

// ============================================================================
// 2. BLOQUEO DE MÓDULOS NO CONTRATADOS VÍA API DIRECTA
// ============================================================================
test('Seguridad 2.2: Los módulos no contratados no se pueden utilizar llamando directamente a sus APIs', () => {
  // tenant_moda_01 tiene plan Pro (ecommerce, blog, clasificados) SIN subastas ni inmobiliaria
  const tenantWithoutAuctions = 'tenant_moda_01';
  assert.equal(
    fenixDb.isModuleAuthorized(tenantWithoutAuctions, 'subastas'),
    false,
    'El tenant sin plan Enterprise no debe tener autorizado el módulo de subastas'
  );

  // Consulta de subastas debe retornar lista vacía
  const auctions = fenixDb.getAuctions(tenantWithoutAuctions);
  assert.deepEqual(auctions, []);

  // Intento de puja directa en subastas para tenant no contratado debe ser rechazado
  const bidResult = fenixDb.placeAuctionBid(tenantWithoutAuctions, 'auc_01', 5000, 'Atacante');
  assert.equal(bidResult.success, false);
  assert.match(bidResult.error || '', /no contratado o deshabilitado/i);

  // Intento de consulta de inmobiliaria debe retornar lista vacía
  const properties = fenixDb.getProperties(tenantWithoutAuctions);
  assert.deepEqual(properties, []);
});

// ============================================================================
// 3. ACCESO ADMINISTRATIVO PROTEGIDO POR PERMISOS DE BACKEND (RBAC)
// ============================================================================
test('Seguridad 2.3: El acceso administrativo está protegido por permisos de backend', () => {
  // 1. SuperAdmin protegido contra accesos anónimos
  assert.throws(
    () => requireSuperAdmin(null),
    (err: any) => err instanceof AuthenticationRequiredError
  );

  // 2. SuperAdmin protegido contra usuarios de tenant
  const tenantContext = createMockContext('TENANT_USER', 'tenant_moda_01', 'TENANT_ADMIN');
  assert.throws(
    () => requireSuperAdmin(tenantContext),
    (err: any) => err instanceof ForbiddenAccessError
  );

  // 3. Permisos de rol de tenant: Viewer no puede escribir productos
  const viewerContext = createMockContext('TENANT_USER', 'tenant_moda_01', 'TENANT_VIEWER');
  assert.throws(
    () => enforceTenantOwnership(viewerContext, 'tenant_moda_01', 'tenant:products:write'),
    (err: any) => err instanceof ForbiddenAccessError
  );

  // 4. Admin legítimo de tenant sí puede escribir
  const adminContext = createMockContext('TENANT_USER', 'tenant_moda_01', 'TENANT_ADMIN');
  assert.doesNotThrow(() => {
    enforceTenantOwnership(adminContext, 'tenant_moda_01', 'tenant:products:write');
  });
});

// ============================================================================
// 4. BORRADORES Y CONTENIDO PRIVADO NO VISIBLES PÚBLICAMENTE
// ============================================================================
test('Seguridad 2.4: Los borradores y anuncios privados no se muestran a visitantes no autorizados', () => {
  // Crear un producto borrador en tenant_moda_01
  const draftProduct = fenixDb.createProduct('tenant_moda_01', {
    title: 'Producto Borrador Privado',
    sku: 'DRAFT-SECRET-01',
    price: 150,
    stock: 20,
    categoryId: 'cat_draft',
    categoryName: 'Borradores',
    description: 'Este producto no debe aparecer en tienda pública',
    imageUrl: 'https://example.com/draft.png',
    isPublished: false,
  });

  // La tienda pública de tenant_moda_01 no debe incluir el producto borrador
  const publicProducts = fenixDb.getProducts('tenant_moda_01');
  const foundDraftInList = publicProducts.some((p) => p.id === draftProduct.id);
  assert.equal(foundDraftInList, false, 'Los productos no publicados no deben listarse públicamente');

  // Consulta por ID en tienda pública debe dar undefined
  const publicDetail = fenixDb.getProductById('tenant_moda_01', draftProduct.id);
  assert.equal(publicDetail, undefined, 'La ficha de detalle pública no debe devolver productos no publicados');
});

// ============================================================================
// 5. VALIDACIÓN DE PRECIOS Y CANTIDADES EN EL SERVIDOR
// ============================================================================
test('Seguridad 2.5: Los precios y cantidades se validan en el servidor', () => {
  // Cantidades negativas o no enteras rechazadas por Zod
  const invalidNegativeQty = orderCreationSchema.safeParse({
    customerEmail: 'cliente@test.com',
    customerName: 'Cliente Test',
    items: [{ productId: 'prod_01', quantity: -3 }],
  });
  assert.equal(invalidNegativeQty.success, false);

  const invalidDecimalQty = orderCreationSchema.safeParse({
    customerEmail: 'cliente@test.com',
    customerName: 'Cliente Test',
    items: [{ productId: 'prod_01', quantity: 2.5 }],
  });
  assert.equal(invalidDecimalQty.success, false);

  // Precio negativo en creación de producto rechazado
  const invalidProductPrice = productSchema.safeParse({
    title: 'Producto Gratis Negativo',
    sku: 'PROD-NEG',
    price: -45,
    stock: 10,
    categoryId: 'cat_test',
  });
  assert.equal(invalidProductPrice.success, false);

  // Precio del pedido se calcula siempre en servidor a partir del catálogo
  const validProduct = fenixDb.getProducts('tenant_moda_01')[0];
  assert.ok(validProduct, 'Debe existir al menos un producto en tenant_moda_01');

  const order = fenixDb.createOrder('tenant_moda_01', {
    customerEmail: 'comprador@empresa.com',
    customerName: 'Comprador Legítimo',
    items: [{ productId: validProduct.id, quantity: 2 }],
  });
  assert.equal(order.totalAmount, validProduct.price * 2);
});

// ============================================================================
// 6. CONTROL CONCURRENTE: EL INVENTARIO NO SE VUELVE NEGATIVO
// ============================================================================
test('Seguridad 2.6: El inventario no se vuelve negativo con peticiones concurrentes o excesivas', () => {
  // Crear un producto con stock limitado de 3 unidades
  const limitedProduct = fenixDb.createProduct('tenant_moda_01', {
    title: 'Edición Ultra Limitada',
    sku: 'STOCK-LTD-01',
    price: 300,
    stock: 3,
    categoryId: 'cat_test',
    categoryName: 'Limitados',
    description: 'Solo 3 unidades',
    imageUrl: 'https://example.com/ltd.png',
    isPublished: true,
  });

  // Primer pedido de 2 unidades -> Exitoso, stock restante: 1
  const order1 = fenixDb.createOrder('tenant_moda_01', {
    customerEmail: 'user1@test.com',
    customerName: 'Usuario 1',
    items: [{ productId: limitedProduct.id, quantity: 2 }],
  });
  assert.equal(order1.status, 'PENDING');
  assert.equal(limitedProduct.stock, 1);

  // Segundo pedido de 2 unidades simultáneo -> Debe fallar por stock insuficiente
  assert.throws(
    () => {
      fenixDb.createOrder('tenant_moda_01', {
        customerEmail: 'user2@test.com',
        customerName: 'Usuario 2',
        items: [{ productId: limitedProduct.id, quantity: 2 }],
      });
    },
    (err: any) => err.message.includes('Inventario insuficiente')
  );

  // El stock nunca debe descender de cero
  assert.equal(limitedProduct.stock >= 0, true);
  assert.equal(limitedProduct.stock, 1);
});

// ============================================================================
// 7. PUJAS SIMULTÁNEAS Y REGLAS DE SUBASTAS
// ============================================================================
test('Seguridad 2.7: Las pujas simultáneas cumplen las reglas del sistema e incrementos mínimos', () => {
  // El módulo de subastas está activo en tenant_tech_02 (Enterprise)
  const tenantAuctions = fenixDb.getAuctions('tenant_tech_02');
  assert.ok(tenantAuctions.length > 0, 'Debe haber al menos un lote de subasta en tenant_tech_02');

  const auction = tenantAuctions[0];
  const initialBid = auction.currentBid;
  const minInc = auction.minBidIncrement;

  // Puja inferior al incremento mínimo requerido debe ser rechazada
  const insufficientBid = fenixDb.placeAuctionBid('tenant_tech_02', auction.id, initialBid + 1, 'Pujador Bajo');
  assert.equal(insufficientBid.success, false);
  assert.match(insufficientBid.error || '', /puja mínima requerida/i);

  // Puja válida superior al mínimo requerido debe ser aceptada
  const validBidAmount = initialBid + minInc + 50;
  const validBid = fenixDb.placeAuctionBid('tenant_tech_02', auction.id, validBidAmount, 'Pujador Valido');
  assert.equal(validBid.success, true);
  assert.equal(auction.currentBid, validBidAmount);

  // Puja igual o menor a la nueva puja actual debe ser rechazada inmediatamente
  const duplicateLowerBid = fenixDb.placeAuctionBid('tenant_tech_02', auction.id, validBidAmount, 'Pujador Retrasado');
  assert.equal(duplicateLowerBid.success, false);
});

// ============================================================================
// 8. IDEMPOTENCIA: OPERACIONES REPETIDAS NO DUPLICAN PEDIDOS NI DESCUENTOS
// ============================================================================
test('Seguridad 2.8: Las operaciones repetidas no crean registros o adjudicaciones duplicados', () => {
  const prod = fenixDb.getProducts('tenant_moda_01')[0];
  const initialStock = prod.stock;
  const verificationCode = `FENIX_PAY_IDEMP_${Date.now()}`;

  // Primera ejecución de creación de pedido
  const orderAttempt1 = fenixDb.createOrder('tenant_moda_01', {
    customerEmail: 'idemp@cliente.com',
    customerName: 'Cliente Idempotente',
    items: [{ productId: prod.id, quantity: 1 }],
    paymentVerificationId: verificationCode,
  });

  const stockAfterFirst = prod.stock;
  assert.equal(stockAfterFirst, initialStock - 1);

  // Segunda ejecución con exactamente el mismo paymentVerificationId (reintento de red)
  const orderAttempt2 = fenixDb.createOrder('tenant_moda_01', {
    customerEmail: 'idemp@cliente.com',
    customerName: 'Cliente Idempotente',
    items: [{ productId: prod.id, quantity: 1 }],
    paymentVerificationId: verificationCode,
  });

  // Debe retornar el mismo pedido idéntico
  assert.equal(orderAttempt1.id, orderAttempt2.id);
  assert.equal(orderAttempt1.orderNumber, orderAttempt2.orderNumber);

  // El inventario NO debe haberse descontado una segunda vez
  assert.equal(prod.stock, stockAfterFirst);
});

// ============================================================================
// 9. VALIDACIÓN ESTRICTA DE ARCHIVOS SUBIDOS
// ============================================================================
test('Seguridad 2.9: Los archivos subidos se validan rigurosamente', () => {
  // 1. Archivo de imagen válido
  const validJpg = validateUploadedFile({
    filename: 'portada-producto.jpg',
    sizeBytes: 1024 * 500, // 500 KB
    mimeType: 'image/jpeg',
  });
  assert.equal(validJpg.isValid, true);
  assert.equal(validJpg.sanitizedFilename, 'portada-producto.jpg');

  // 2. Intento de subida de ejecutable malicioso
  const evilPhp = validateUploadedFile({
    filename: 'webshell.php',
    sizeBytes: 2048,
    mimeType: 'text/plain',
  });
  assert.equal(evilPhp.isValid, false);
  assert.match(evilPhp.error || '', /extensión prohibida/i);

  // 3. Intento de Path Traversal en el nombre
  const traversalAttempt = validateUploadedFile({
    filename: '../../../etc/passwd.jpg',
    sizeBytes: 2048,
    mimeType: 'image/jpeg',
  });
  assert.equal(traversalAttempt.isValid, false);
  assert.match(traversalAttempt.error || '', /contiene secuencias de directorio/i);

  // 4. Archivo que supera el tamaño máximo permitido (5MB)
  const oversizedFile = validateUploadedFile({
    filename: 'video-pesado.jpg',
    sizeBytes: 15 * 1024 * 1024, // 15 MB
    mimeType: 'image/jpeg',
  });
  assert.equal(oversizedFile.isValid, false);
  assert.match(oversizedFile.error || '', /supera el tamaño máximo/i);
});

// ============================================================================
// 10. PRIVACIDAD: LAS PÁGINAS PÚBLICAS NO EXPONEN DATOS SENSIBLES
// ============================================================================
test('Seguridad 2.10: Las páginas públicas no exponen datos personales o privados', () => {
  const resolution = resolveTenantByHostname('modaurbana.fenixcms.app');
  assert.equal(resolution.success, true);
  const tenant = resolution.tenant!;

  // Verificar que el DTO público no exponga secretos
  const tenantKeys = Object.keys(tenant);
  assert.equal(tenantKeys.includes('password'), false);
  assert.equal(tenantKeys.includes('adminPasswordHash'), false);
  assert.equal(tenantKeys.includes('stripeSecretKey'), false);
  assert.equal(tenantKeys.includes('databaseUrl'), false);
});

// ============================================================================
// 11. PERSISTENCIA SEGURA: FALLOS DE BD NO GENERAN FALSOS POSITIVOS
// ============================================================================
test('Seguridad 2.11: Los fallos de PostgreSQL no generan datos falsos ni estados de éxito', async () => {
  // En ausencia de PostgreSQL real, checkDatabaseHealth nunca debe declarar 'isOperational: true'
  const health = await checkDatabaseHealth();
  assert.notEqual(health.isOperational, true);
  assert.ok(['UNCONFIGURED', 'DISCONNECTED'].includes(health.status));

  // En producción, assertProductionPersistenceReady previene escrituras simuladas
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    assert.throws(
      () => assertProductionPersistenceReady(),
      (err: any) => err.message.includes('PERSISTENCIA_NO_CONFIGURADA')
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
