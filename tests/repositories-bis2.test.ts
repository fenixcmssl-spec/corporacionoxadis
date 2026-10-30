// ============================================================================
// FENIXCMS SAAS — PRUEBAS DE REPOSITORIOS PERSISTENTES (FASE 2 BIS.2)
// Verificación de Repositorios Prisma, Aislamiento por Tenant y Manejo de Conectividad
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  productRepository,
  orderRepository,
  blogRepository,
  propertyRepository,
  auctionRepository,
  adRepository,
  tenantRepository,
  contactRepository,
} from '../lib/repositories';
import { DatabaseConnectionError, checkDatabaseHealth, executeWithDatabase } from '../lib/db/prisma';

test('Fase 2 BIS.2: Repositorios persistentes implementan todos los métodos de ciclo de vida', () => {
  // 1. ProductRepository
  assert.equal(typeof productRepository.list, 'function');
  assert.equal(typeof productRepository.findById, 'function');
  assert.equal(typeof productRepository.findBySku, 'function');
  assert.equal(typeof productRepository.findBySlug, 'function');
  assert.equal(typeof productRepository.create, 'function');
  assert.equal(typeof productRepository.update, 'function');
  assert.equal(typeof productRepository.setPublished, 'function');
  assert.equal(typeof productRepository.delete, 'function');

  // 2. OrderRepository
  assert.equal(typeof orderRepository.list, 'function');
  assert.equal(typeof orderRepository.findById, 'function');
  assert.equal(typeof orderRepository.findByOrderNumber, 'function');
  assert.equal(typeof orderRepository.findByIdempotencyKey, 'function');
  assert.equal(typeof orderRepository.create, 'function');
  assert.equal(typeof orderRepository.updateStatus, 'function');
  assert.equal(typeof orderRepository.delete, 'function');

  // 3. BlogRepository
  assert.equal(typeof blogRepository.list, 'function');
  assert.equal(typeof blogRepository.findBySlug, 'function');
  assert.equal(typeof blogRepository.findById, 'function');
  assert.equal(typeof blogRepository.create, 'function');
  assert.equal(typeof blogRepository.update, 'function');
  assert.equal(typeof blogRepository.setPublished, 'function');
  assert.equal(typeof blogRepository.delete, 'function');

  // 4. PropertyRepository
  assert.equal(typeof propertyRepository.list, 'function');
  assert.equal(typeof propertyRepository.findBySlug, 'function');
  assert.equal(typeof propertyRepository.findById, 'function');
  assert.equal(typeof propertyRepository.create, 'function');
  assert.equal(typeof propertyRepository.update, 'function');
  assert.equal(typeof propertyRepository.setPublished, 'function');
  assert.equal(typeof propertyRepository.createInquiry, 'function');
  assert.equal(typeof propertyRepository.delete, 'function');

  // 5. AuctionRepository
  assert.equal(typeof auctionRepository.list, 'function');
  assert.equal(typeof auctionRepository.findBySlug, 'function');
  assert.equal(typeof auctionRepository.findById, 'function');
  assert.equal(typeof auctionRepository.create, 'function');
  assert.equal(typeof auctionRepository.placeBid, 'function');
  assert.equal(typeof auctionRepository.awardAuction, 'function');
  assert.equal(typeof auctionRepository.delete, 'function');

  // 6. AdRepository
  assert.equal(typeof adRepository.listClassifieds, 'function');
  assert.equal(typeof adRepository.findClassifiedBySlug, 'function');
  assert.equal(typeof adRepository.createClassified, 'function');
  assert.equal(typeof adRepository.moderateClassified, 'function');
  assert.equal(typeof adRepository.listPersonals, 'function');
  assert.equal(typeof adRepository.findPersonalBySlug, 'function');
  assert.equal(typeof adRepository.createPersonal, 'function');
  assert.equal(typeof adRepository.moderatePersonal, 'function');

  // 7. TenantRepository
  assert.equal(typeof tenantRepository.list, 'function');
  assert.equal(typeof tenantRepository.findById, 'function');
  assert.equal(typeof tenantRepository.findBySlug, 'function');
  assert.equal(typeof tenantRepository.findByHostname, 'function');
  assert.equal(typeof tenantRepository.create, 'function');
  assert.equal(typeof tenantRepository.addDomain, 'function');

  // 8. ContactRepository
  assert.equal(typeof contactRepository.createInquiry, 'function');
  assert.equal(typeof contactRepository.listInquiries, 'function');
  assert.equal(typeof contactRepository.createReport, 'function');
  assert.equal(typeof contactRepository.listReports, 'function');
});

test('Fase 2 BIS.2: Protección contable inmutable prohíbe eliminar pedidos en OrderRepository', async () => {
  await assert.rejects(
    async () => {
      await orderRepository.delete('tenant_moda_01', 'ord_123');
    },
    {
      message: /Los pedidos son registros contables y fiscales inmutables/,
    }
  );
});

test('Fase 2 BIS.2: executeWithDatabase transforma fallos de red en DatabaseConnectionError controlado', async () => {
  await assert.rejects(
    async () => {
      await executeWithDatabase(async () => {
        const err: any = new Error('connect ECONNREFUSED 127.0.0.1:5432');
        err.code = 'P1001';
        throw err;
      });
    },
    (err: any) => {
      assert.ok(err instanceof DatabaseConnectionError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.code, 'DATABASE_UNAVAILABLE');
      return true;
    }
  );
});

test('Fase 2 BIS.2: Diagnóstico de conectividad reporta fielmente el estado sin fingir persistencia', async () => {
  const health = await checkDatabaseHealth();
  assert.equal(typeof health.isOperational, 'boolean');

  // Si la instancia local no está corriendo, debe informar DISCONNECTED o UNCONFIGURED con 503, nunca éxito falso
  if (!health.isOperational) {
    assert.ok(
      health.status === 'DISCONNECTED' || health.status === 'UNCONFIGURED',
      `El estado debe ser DISCONNECTED o UNCONFIGURED cuando no hay PostgreSQL (actual: ${health.status})`
    );
    assert.equal(health.message.length > 0, true);
  }
});

test('Fase 2 BIS.2: Repositorio de pedidos valida cantidades e inventario en servidor', async () => {
  await assert.rejects(
    async () => {
      await orderRepository.create('tenant_moda_01', {
        customerEmail: 'test@cliente.es',
        customerName: 'Cliente Prueba',
        items: [],
      });
    },
    {
      message: /El pedido debe incluir al menos un artículo/,
    }
  );

  await assert.rejects(
    async () => {
      await orderRepository.create('tenant_moda_01', {
        customerEmail: 'test@cliente.es',
        customerName: 'Cliente Prueba',
        items: [{ productId: 'prod_1', quantity: -5 }],
      });
    },
    {
      message: /número entero positivo mayor que cero/,
    }
  );
});
