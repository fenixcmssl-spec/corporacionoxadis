// ============================================================================
// FENIXCMS SAAS — SERVICIO DE OPERACIONES CON AISLAMIENTO ESTRICTO DE TENANTS
// FASE 1.5: OPERACIONES DE LECTURA Y ESCRITURA CON VERIFICACIÓN DE PROPIETARIO
// ============================================================================

import { fenixDb } from '../db/client';
import { SecurityContext, enforceTenantOwnership } from '../security/authorization';
import { ProductDto, StoreOrderDto, DomainDto, CmsPageDto } from '../types/fenix';
import { securityAudit } from '../security/audit';

export class TenantIsolatedService {
  /**
   * Obtiene el catálogo de productos de un tenant con verificación obligatoria de propietario.
   */
  public getProducts(context: SecurityContext, targetTenantId: string): ProductDto[] {
    // 1. Aplicar barrera de aislamiento en servidor
    enforceTenantOwnership(context, targetTenantId, 'tenant:products:read');

    // 2. Obtener datos directamente desde el repositorio filtrando por tenantId
    return fenixDb.getAllProductsAdmin(targetTenantId);
  }

  /**
   * Crea un nuevo producto en el catálogo de un tenant.
   * Exige rol con permiso de escritura y coincidencia estricta de tenant.
   */
  public createProduct(
    context: SecurityContext,
    targetTenantId: string,
    productData: Omit<ProductDto, 'id' | 'tenantId'>
  ): ProductDto {
    enforceTenantOwnership(context, targetTenantId, 'tenant:products:write');

    const created = fenixDb.createProduct(targetTenantId, productData);

    securityAudit.log({
      action: 'TENANT_PRODUCT_CREATED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Producto '${created.title}' (SKU: ${created.sku}) creado por usuario autorizado.`,
      metadata: { productId: created.id, price: created.price, stock: created.stock },
    });

    return created;
  }

  /**
   * Obtiene los pedidos recibidos por un tenant.
   */
  public getOrders(context: SecurityContext, targetTenantId: string): StoreOrderDto[] {
    enforceTenantOwnership(context, targetTenantId, 'tenant:orders:read');
    return fenixDb.getOrders(targetTenantId);
  }

  /**
   * Registra un nuevo pedido en la tienda del tenant.
   */
  public createOrder(
    context: SecurityContext,
    targetTenantId: string,
    orderData: {
      customerEmail: string;
      customerName: string;
      items: { productId: string; quantity: number }[];
      paymentVerificationId?: string;
    }
  ): StoreOrderDto {
    enforceTenantOwnership(context, targetTenantId, 'tenant:orders:manage');

    const created = fenixDb.createOrder(targetTenantId, orderData);

    securityAudit.log({
      action: 'TENANT_ORDER_CREATED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Pedido #${created.orderNumber} por importe de ${created.totalAmount} € registrado en la organización.`,
      metadata: { orderId: created.id, orderNumber: created.orderNumber },
    });

    return created;
  }

  /**
   * Obtiene la lista de dominios asociados al tenant.
   */
  public getDomains(context: SecurityContext, targetTenantId: string): DomainDto[] {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');
    return fenixDb.getDomains(targetTenantId);
  }

  /**
   * Asocia un nuevo dominio al tenant.
   */
  public addDomain(context: SecurityContext, targetTenantId: string, hostname: string): DomainDto {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');

    const newDomain = fenixDb.addDomain(targetTenantId, hostname);

    securityAudit.log({
      action: 'TENANT_DOMAIN_LINKED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Dominio '${hostname}' enlazado a la organización para aprovisionamiento.`,
      metadata: { domainId: newDomain.id, hostname },
    });

    return newDomain;
  }

  /**
   * Obtiene las páginas CMS de un tenant.
   */
  public getPages(context: SecurityContext, targetTenantId: string): CmsPageDto[] {
    enforceTenantOwnership(context, targetTenantId, 'tenant:pages:read');
    return fenixDb.getPages(targetTenantId);
  }
}

export const tenantIsolatedService = new TenantIsolatedService();
