// ============================================================================
// FENIXCMS SAAS — PRUEBAS DE ECOMMERCE PERSISTENTE Y CHECKOUT SEGURO (FASE 2 BIS.5)
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db/prisma';
import { orderRepository, OrderRepository } from '../lib/repositories/order.repository';
import { paymentService, PaymentGatewayError } from '../lib/services/payment.service';
import { POST as publicResourcePost } from '../app/api/public/[domain]/[resource]/route';
import { POST as webhookPaymentPost } from '../app/api/webhooks/payments/[provider]/route';
import { fenixDb } from '../lib/db/client';

test('Fase 2 BIS.5 - Prueba 1: Petición con precio manipulado por el cliente es ignorada y el servidor calcula el total real', async () => {
  // Verificar en la ruta pública POST /api/public/modaurbana.fenixcms.app/orders
  // El cliente intenta inyectar un precio manipulado de 1.00 € y totalAmount de 1.00 €
  const tenantProducts = fenixDb.getProducts('tenant_moda_01');
  assert.ok(tenantProducts.length > 0, 'Debe haber productos para tenant_moda_01');
  const targetProduct = tenantProducts[0];
  const realPrice = targetProduct.price;
  const requestedQty = 2;
  const expectedTotal = realPrice * requestedQty;

  const req = new NextRequest('http://modaurbana.fenixcms.app/api/public/modaurbana.fenixcms.app/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Cliente Prueba Precios',
      customerEmail: 'cliente@precio-test.es',
      items: [
        {
          productId: targetProduct.id,
          quantity: requestedQty,
          // Intento de spoofing de precio por el cliente
          price: 0.01,
          unitPrice: 0.01,
          totalAmount: 0.02,
        },
      ],
      // Intento de spoofing del total general
      totalAmount: 0.02,
    }),
  });

  const res = await publicResourcePost(req, {
    params: Promise.resolve({ domain: 'modaurbana.fenixcms.app', resource: 'orders' }),
  });

  const json = await res.json();
  assert.equal(res.status, 200, `Respuesta esperada 200, recibido ${res.status}`);
  assert.equal(json.success, true);
  assert.ok(json.order, 'Debe retornar el pedido creado');
  // El importe total DEBE ser el calculado por el servidor con el precio de catálogo, no 0.02
  assert.equal(
    Number(json.order.totalAmount),
    expectedTotal,
    `El total cobrado debe ser ${expectedTotal} € (precio de catálogo ${realPrice} * ${requestedQty}), pero fue ${json.order.totalAmount}`
  );
});

test('Fase 2 BIS.5 - Prueba 2: Producto perteneciente a otro tenant es estrictamente rechazado', async () => {
  // Obtener producto de tenant_tech_02
  const techProducts = fenixDb.getProducts('tenant_tech_02');
  assert.ok(techProducts.length > 0, 'Debe haber productos para tenant_tech_02');
  const techProduct = techProducts[0];

  // Intentar comprar el producto de tenant_tech_02 desde el dominio de tenant_moda_01
  const req = new NextRequest('http://modaurbana.fenixcms.app/api/public/modaurbana.fenixcms.app/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Atacante Cross-Tenant',
      customerEmail: 'hacker@crosstenant.com',
      items: [
        {
          productId: techProduct.id,
          quantity: 1,
        },
      ],
    }),
  });

  const res = await publicResourcePost(req, {
    params: Promise.resolve({ domain: 'modaurbana.fenixcms.app', resource: 'orders' }),
  });

  const json = await res.json();
  assert.equal(res.status, 400, 'Debe retornar error 400 por violación de aislamiento de tenant');
  assert.equal(json.success, false);
  assert.match(json.error, /no encontrado o no pertenece a este tenant/i);
});

test('Fase 2 BIS.5 - Prueba 3: Petición con stock insuficiente falla y no descuenta inventario', async () => {
  const tenantProducts = fenixDb.getProducts('tenant_moda_01');
  const targetProduct = tenantProducts[0];
  const initialStock = targetProduct.stock;
  const excessiveQty = initialStock + 1000;

  const req = new NextRequest('http://modaurbana.fenixcms.app/api/public/modaurbana.fenixcms.app/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Cliente Stock Excesivo',
      customerEmail: 'stock@test.com',
      items: [
        {
          productId: targetProduct.id,
          quantity: excessiveQty,
        },
      ],
    }),
  });

  const res = await publicResourcePost(req, {
    params: Promise.resolve({ domain: 'modaurbana.fenixcms.app', resource: 'orders' }),
  });

  const json = await res.json();
  assert.equal(res.status, 400, 'Debe retornar error 400 por falta de stock');
  assert.equal(json.success, false);
  assert.match(json.error, /Inventario insuficiente/i);

  // Verificar que el inventario no se modificó
  assert.equal(targetProduct.stock, initialStock, 'El inventario del producto no debe haberse reducido');
});

test('Fase 2 BIS.5 - Prueba 4: Concurrencia sobre el último artículo evita stock negativo y no confirma ambos pedidos', async () => {
  // Creamos un producto temporal en memoria con stock exactamente 1
  const testProduct = fenixDb.createProduct('tenant_moda_01', {
    title: 'Artículo Único de Colección',
    sku: `SKU-LAST-UNIT-${Date.now()}`,
    price: 99.99,
    stock: 1,
    categoryId: 'cat_moda',
    isPublished: true,
  });

  assert.equal(testProduct.stock, 1);

  // Simular dos compras simultáneas para la última unidad
  const req1 = () =>
    fenixDb.createOrder('tenant_moda_01', {
      customerName: 'Comprador Rápido 1',
      customerEmail: 'rapido1@test.es',
      items: [{ productId: testProduct.id, quantity: 1 }],
    });

  const req2 = () =>
    fenixDb.createOrder('tenant_moda_01', {
      customerName: 'Comprador Rápido 2',
      customerEmail: 'rapido2@test.es',
      items: [{ productId: testProduct.id, quantity: 1 }],
    });

  // Ejecución concurrente
  const results = await Promise.allSettled([
    Promise.resolve().then(req1),
    Promise.resolve().then(req2),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactamente un pedido debe haber triunfado');
  assert.equal(rejected.length, 1, 'El segundo pedido concurrente debe haber fallado');
  assert.match((rejected[0] as PromiseRejectedResult).reason.message, /Inventario insuficiente/i);

  // El stock final no debe ser negativo
  assert.equal(testProduct.stock, 0, 'El stock debe ser 0 y nunca negativo (< 0)');
});

test('Fase 2 BIS.5 - Prueba 5: Peticiones repetidas con la misma clave de idempotencia no duplican pedidos ni descuentan inventario dos veces', async () => {
  const tenantProducts = fenixDb.getProducts('tenant_moda_01');
  const prod = tenantProducts[0];
  const stockBefore = prod.stock;

  // Mock en memoria del repositorio de pedidos con simulación de idempotencia en Prisma
  const idempotencyKey = `idem_test_${Date.now()}_abc`;

  let callCount = 0;
  const mockOrders = new Map<string, any>();
  const originalFindFirst = (prisma.storeOrder as any)?.findFirst;
  const originalTransaction = (prisma as any)?.$transaction;

  try {
    // Interceptar Prisma para simular almacenamiento de pedidos con idempotencia
    (prisma.storeOrder as any).findFirst = async ({ where }: any) => {
      if (where.tenantId && where.idempotencyKey) {
        return mockOrders.get(`${where.tenantId}:${where.idempotencyKey}`) || null;
      }
      return null;
    };

    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        product: {
          findFirst: async () => ({
            id: 'prod_test_idempotent',
            tenantId: 'tenant_test',
            sku: 'SKU-IDEM',
            title: 'Producto Idempotente',
            price: new Prisma.Decimal(50),
            stock: 10,
            isPublished: true,
          }),
          update: async ({ data }: any) => {
            callCount++;
            return {};
          },
        },
        storeOrder: {
          create: async ({ data }: any) => {
            const orderRecord = {
              id: 'ord_created_1',
              tenantId: data.tenantId,
              orderNumber: data.orderNumber,
              idempotencyKey: data.idempotencyKey,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              totalAmount: data.totalAmount,
              status: data.status,
              paymentStatus: data.paymentStatus,
              items: data.items.create,
            };
            mockOrders.set(`${data.tenantId}:${data.idempotencyKey}`, orderRecord);
            return orderRecord;
          },
        },
      };
      return callback(txMock);
    };

    const repo = new OrderRepository();

    // 1ª Petición
    const order1 = await repo.create('tenant_test', {
      customerName: 'Cliente Idempotencia',
      customerEmail: 'idem@test.es',
      idempotencyKey,
      items: [{ productId: 'prod_test_idempotent', quantity: 1 }],
    });

    assert.ok(order1, 'El primer pedido debe crearse exitosamente');
    assert.equal(callCount, 1, 'El stock debe descontarse una vez');

    // 2ª Petición con la MISMA clave de idempotencia
    const order2 = await repo.create('tenant_test', {
      customerName: 'Cliente Idempotencia',
      customerEmail: 'idem@test.es',
      idempotencyKey,
      items: [{ productId: 'prod_test_idempotent', quantity: 1 }],
    });

    assert.equal(order2.id, order1.id, 'Debe devolver el mismo pedido existente');
    assert.equal(order2.orderNumber, order1.orderNumber);
    assert.equal(callCount, 1, 'El stock NO debe descontarse una segunda vez');
  } finally {
    if (originalFindFirst) (prisma.storeOrder as any).findFirst = originalFindFirst;
    if (originalTransaction) (prisma as any).$transaction = originalTransaction;
  }
});

test('Fase 2 BIS.5 - Prueba 6: Webhooks de pago con firma inválida o manipulada se rechazan con 400 y no confirman pedidos', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousKey = process.env.STRIPE_SECRET_KEY;
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_abc';

    const rawPayload = JSON.stringify({
      tenantId: 'tenant_moda_01',
      orderId: 'ord_pending_01',
      transactionId: 'ch_test_12345',
    });

    // 1. Petición sin firma
    const reqNoSig = new NextRequest('http://localhost:3000/api/webhooks/payments/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: rawPayload,
    });
    const resNoSig = await webhookPaymentPost(reqNoSig, {
      params: Promise.resolve({ provider: 'stripe' }),
    });
    assert.equal(resNoSig.status, 400, 'Debe devolver 400 si falta la firma');
    const jsonNoSig = await resNoSig.json();
    assert.equal(jsonNoSig.error, 'INVALID_WEBHOOK_SIGNATURE');

    // 2. Petición con firma falsa o manipulada
    const reqBadSig = new NextRequest('http://localhost:3000/api/webhooks/payments/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1600000000,v1=bad_forged_signature_hash',
      },
      body: rawPayload,
    });
    const resBadSig = await webhookPaymentPost(reqBadSig, {
      params: Promise.resolve({ provider: 'stripe' }),
    });
    assert.equal(resBadSig.status, 400, 'Debe devolver 400 para firma adulterada');
    const jsonBadSig = await resBadSig.json();
    assert.equal(jsonBadSig.error, 'INVALID_WEBHOOK_SIGNATURE');

    // 3. Verificación con firma criptográfica válida HMAC-SHA256
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const validHmac = crypto
      .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');
    const validHeader = `t=${timestamp},v1=${validHmac}`;

    const checkResult = paymentService.verifyWebhookSignature('STRIPE', validHeader, rawPayload);
    assert.equal(checkResult.valid, true, 'La firma HMAC legítima debe ser verificada como válida');
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    process.env.STRIPE_SECRET_KEY = previousKey;
  }
});

test('Fase 2 BIS.5 - Prueba 7: Si faltan credenciales del proveedor de pagos, se informa indisponibilidad con 503 sin fingir cobro', async () => {
  const savedStripeKey = process.env.STRIPE_SECRET_KEY;
  const savedStripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    // Eliminar credenciales del entorno
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const config = paymentService.checkProviderConfigured('STRIPE');
    assert.equal(config.isConfigured, false, 'Stripe debe figurar como no configurado');
    assert.ok(config.missingKeys.includes('STRIPE_SECRET_KEY'));
    assert.ok(config.missingKeys.includes('STRIPE_WEBHOOK_SECRET'));

    const rawPayload = JSON.stringify({
      tenantId: 'tenant_moda_01',
      orderId: 'ord_123',
      transactionId: 'tx_fail',
    });

    const req = new NextRequest('http://localhost:3000/api/webhooks/payments/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'any_sig',
      },
      body: rawPayload,
    });

    const res = await webhookPaymentPost(req, {
      params: Promise.resolve({ provider: 'stripe' }),
    });

    assert.equal(res.status, 503, 'Debe devolver 503 por pasarela no configurada');
    const json = await res.json();
    assert.equal(json.error, 'GATEWAY_UNCONFIGURED');
    assert.match(json.message, /no configurada en el servidor/i);
  } finally {
    process.env.STRIPE_SECRET_KEY = savedStripeKey;
    process.env.STRIPE_WEBHOOK_SECRET = savedStripeSecret;
  }
});

test('Fase 2 BIS.5 - Prueba 8: Un pedido creado permanece estrictamente en PENDING y UNVERIFIED mientras no se reciba confirmación bancaria real', async () => {
  const tenantProducts = fenixDb.getProducts('tenant_moda_01');
  const targetProduct = tenantProducts.find((p) => p.stock > 0) || tenantProducts[0];
  if (targetProduct.stock === 0) targetProduct.stock = 10;

  // Intento de cliente de enviar token fraudulento FENIX_PAY_ o paymentVerificationId
  const req = new NextRequest('http://modaurbana.fenixcms.app/api/public/modaurbana.fenixcms.app/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Cliente Bypass Pago',
      customerEmail: 'bypass@test.es',
      simulateVerifiedPayment: true,
      paymentVerificationId: 'FENIX_PAY_FORGED_123456789',
      items: [
        {
          productId: targetProduct.id,
          quantity: 1,
        },
      ],
    }),
  });

  const res = await publicResourcePost(req, {
    params: Promise.resolve({ domain: 'modaurbana.fenixcms.app', resource: 'orders' }),
  });

  const json = await res.json();
  assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${json.error || JSON.stringify(json)}`);
  assert.equal(json.success, true);
  // El estado DEBE ser PENDING a pesar de simulateVerifiedPayment o FENIX_PAY_
  assert.equal(
    json.order.status,
    'PENDING',
    'El pedido debe crearse estrictamente en estado PENDING y no PAID'
  );
  assert.equal(
    json.order.verificationCode,
    undefined,
    'No debe aceptarse ningún verificationCode falsificado por el navegador'
  );
});
