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

  /**
   * Obtiene la información general y metadatos del tenant.
   */
  public getTenantInfo(context: SecurityContext, targetTenantId: string) {
    enforceTenantOwnership(context, targetTenantId);
    const tenant = fenixDb.getTenantById(targetTenantId);
    if (!tenant) {
      throw new Error(`Tenant con ID '${targetTenantId}' no encontrado.`);
    }
    return tenant;
  }

  /**
   * Obtiene los plugins instalados y su estado en el tenant.
   */
  public getPlugins(context: SecurityContext, targetTenantId: string) {
    enforceTenantOwnership(context, targetTenantId);
    return fenixDb.getPlugins(targetTenantId);
  }

  /**
   * Activa o desactiva un plugin en el tenant.
   */
  public togglePlugin(context: SecurityContext, targetTenantId: string, slug: string) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');
    const toggled = fenixDb.togglePlugin(targetTenantId, slug);
    securityAudit.log({
      action: 'TENANT_PLUGIN_TOGGLED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Plugin '${slug}' conmutado por usuario autorizado.`,
    });
    return toggled;
  }

  /**
   * Obtiene los temas disponibles y activos para el tenant.
   */
  public getThemes(context: SecurityContext, targetTenantId: string) {
    enforceTenantOwnership(context, targetTenantId);
    return fenixDb.getThemes(targetTenantId);
  }

  /**
   * Activa un tema específico para el tenant.
   */
  public setActiveTheme(context: SecurityContext, targetTenantId: string, slug: string) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');
    const theme = fenixDb.setActiveTheme(targetTenantId, slug);
    securityAudit.log({
      action: 'TENANT_THEME_ACTIVATED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Tema visual '${slug}' activado para la organización.`,
    });
    return theme;
  }

  /**
   * Obtiene los idiomas configurados para el tenant.
   */
  public getLanguages(context: SecurityContext, targetTenantId: string) {
    enforceTenantOwnership(context, targetTenantId);
    return fenixDb.getLanguages(targetTenantId);
  }

  // ==========================================================================
  // OPERACIONES PERSISTENTES CON PRISMA (POSTGRESQL CON ENFORCEMENT SERVER-SIDE)
  // ==========================================================================

  public async getProductsAsync(context: SecurityContext, targetTenantId: string, params?: { page?: number; pageSize?: number }) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:products:read');
    return fenixDb.productsRepo.list({ tenantId: targetTenantId, ...params });
  }

  public async createProductAsync(
    context: SecurityContext,
    targetTenantId: string,
    productData: Parameters<typeof fenixDb.productsRepo.create>[1]
  ) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:products:write');
    const created = await fenixDb.productsRepo.create(targetTenantId, productData);

    securityAudit.log({
      action: 'TENANT_PRODUCT_CREATED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Producto '${created.title}' (SKU: ${created.sku}) creado en PostgreSQL.`,
      metadata: { productId: created.id, price: Number(created.price), stock: created.stock },
    });

    return created;
  }

  public async getOrdersAsync(context: SecurityContext, targetTenantId: string, params?: { page?: number; pageSize?: number }) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:orders:read');
    return fenixDb.ordersRepo.list({ tenantId: targetTenantId, ...params });
  }

  public async createOrderAsync(
    context: SecurityContext,
    targetTenantId: string,
    orderData: Parameters<typeof fenixDb.ordersRepo.create>[1]
  ) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:orders:manage');
    const created = await fenixDb.ordersRepo.create(targetTenantId, orderData);

    securityAudit.log({
      action: 'TENANT_ORDER_CREATED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Pedido #${created.orderNumber} por importe de ${created.totalAmount} € registrado en PostgreSQL.`,
      metadata: { orderId: created.id, orderNumber: created.orderNumber },
    });

    return created;
  }

  public async getDomainsAsync(context: SecurityContext, targetTenantId: string) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');
    return fenixDb.tenantsRepo.getDomains(targetTenantId);
  }

  public async addDomainAsync(context: SecurityContext, targetTenantId: string, hostname: string) {
    enforceTenantOwnership(context, targetTenantId, 'tenant:domains:manage');
    const domain = await fenixDb.tenantsRepo.addDomain(targetTenantId, hostname);

    securityAudit.log({
      action: 'TENANT_DOMAIN_LINKED',
      actorId: context.userId,
      actorEmail: context.email,
      actorRole: context.role,
      targetTenantId,
      details: `Dominio '${hostname}' registrado en base de datos PostgreSQL.`,
      metadata: { domainId: domain.id, hostname },
    });

    return domain;
  }
}

export const tenantIsolatedService = new TenantIsolatedService();
