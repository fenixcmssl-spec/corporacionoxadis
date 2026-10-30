// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE PEDIDOS (ECOMMERCE)
// FASE 2 BIS.5: IDEMPOTENCIA, INVENTARIO ATÓMICO Y ESTADOS FINANCIEROS EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, OrderStatus, PaymentVerificationStatus } from '@prisma/client';

export interface OrderListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  customerEmail?: string;
}

export interface CreateOrderOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  billingAddress?: string;
  items: CreateOrderOrderItemInput[];
  idempotencyKey?: string;
  paymentVerificationId?: string;
  notes?: string;
}

export class OrderRepository {
  /**
   * Consulta paginada con aislamiento estricto por tenant.
   */
  public async list(params: OrderListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.StoreOrderWhereInput = {
        tenantId: params.tenantId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.storeOrder.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        }),
        prisma.storeOrder.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    });
  }

  /**
   * Consulta por identificador con verificación de pertenencia al tenant.
   */
  public async findById(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      return prisma.storeOrder.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });
    });
  }

  /**
   * Consulta por número de pedido dentro del tenant.
   */
  public async findByOrderNumber(tenantId: string, orderNumber: string) {
    return executeWithDatabase(async () => {
      return prisma.storeOrder.findFirst({
        where: { tenantId, orderNumber },
        include: { items: true },
      });
    });
  }

  /**
   * Consulta por clave de idempotencia dentro del tenant.
   */
  public async findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return executeWithDatabase(async () => {
      return prisma.storeOrder.findFirst({
        where: { tenantId, idempotencyKey },
        include: { items: true },
      });
    });
  }

  /**
   * Creación atómica de pedido con:
   * 1. Idempotencia: evita duplicados si ya fue enviado con la misma clave.
   * 2. Verificación de stock y cálculo de precios exclusivamente en servidor.
   * 3. Descuento atómico de inventario en transacción Prisma sin permitir stock negativo.
   * 4. Estado inicial estrictamente PENDING y UNVERIFIED (prohibición de pagos simulados).
   */
  public async create(tenantId: string, input: CreateOrderInput) {
    return executeWithDatabase(async () => {
      if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
        throw new Error('El pedido debe incluir al menos un artículo.');
      }

      // 1. Verificación de Idempotencia estricta por ámbito de tenant
      if (input.idempotencyKey) {
        const existing = await prisma.storeOrder.findFirst({
          where: { tenantId, idempotencyKey: input.idempotencyKey },
          include: { items: true },
        });
        if (existing) {
          return existing;
        }
      }

      if (input.paymentVerificationId) {
        const existingByPayment = await prisma.storeOrder.findFirst({
          where: { tenantId, paymentVerificationId: input.paymentVerificationId },
          include: { items: true },
        });
        if (existingByPayment) {
          return existingByPayment;
        }
      }

      // 2. Validación de cantidades
      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error('La cantidad de cada artículo debe ser un número entero positivo mayor que cero.');
        }
      }

      // 3. Ejecución atómica en transacción Prisma
      const order = await prisma.$transaction(async (tx) => {
        let subtotal = new Prisma.Decimal(0);
        const orderItemsData = [];

        for (const item of input.items) {
          // Consultar producto exigiendo pertenencia al tenant y estado publicado
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId, isPublished: true },
          });

          if (!product) {
            throw new Error(`Producto '${item.productId}' no encontrado o no pertenece a esta tienda.`);
          }

          if (product.stock < item.quantity) {
            throw new Error(
              `Inventario insuficiente para "${product.title}". Stock disponible: ${product.stock}, solicitado: ${item.quantity}.`
            );
          }

          // Reducción atómica de inventario en PostgreSQL
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          // El precio unitario y total se calculan exclusivamente en el servidor
          const itemTotal = product.price.mul(item.quantity);
          subtotal = subtotal.add(itemTotal);

          // Congelar datos comerciales históricos en StoreOrderItem
          orderItemsData.push({
            productId: product.id,
            productSku: product.sku,
            productName: product.title,
            unitPrice: product.price,
            quantity: item.quantity,
            totalPrice: itemTotal,
          });
        }

        const orderNumber = `FNX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // REGLA 5: Estado inicial siempre PENDING y UNVERIFIED.
        // Nunca confiar en un paymentVerificationId provisto por el cliente ni simular pagos.
        return tx.storeOrder.create({
          data: {
            tenantId,
            orderNumber,
            idempotencyKey: input.idempotencyKey || null,
            paymentVerificationId: null,
            customerName: input.customerName.trim(),
            customerEmail: input.customerEmail.trim().toLowerCase(),
            customerPhone: input.customerPhone || null,
            shippingAddress: input.shippingAddress || null,
            billingAddress: input.billingAddress || null,
            subtotal,
            taxAmount: new Prisma.Decimal(0),
            shippingCost: new Prisma.Decimal(0),
            totalAmount: subtotal,
            currency: 'EUR',
            status: OrderStatus.PENDING,
            paymentStatus: PaymentVerificationStatus.UNVERIFIED,
            notes: input.notes || null,
            items: {
              create: orderItemsData,
            },
          },
          include: { items: true },
        });
      });

      return order;
    });
  }

  /**
   * Confirmación auténtica de pago en el servidor (tras webhook o pasarela bancaria verificada).
   * Operación idempotente y atómica.
   */
  public async confirmPayment(
    tenantId: string,
    orderId: string,
    paymentDetails: {
      provider: string;
      transactionId: string;
      paymentVerificationId?: string;
      amount?: number;
    }
  ) {
    return executeWithDatabase(async () => {
      if (!paymentDetails.transactionId || typeof paymentDetails.transactionId !== 'string') {
        throw new Error('Identificador de transacción del proveedor bancario no válido.');
      }

      const verificationId = paymentDetails.paymentVerificationId || paymentDetails.transactionId;

      return prisma.$transaction(async (tx) => {
        const order = await tx.storeOrder.findFirst({
          where: { id: orderId, tenantId },
          include: { items: true },
        });

        if (!order) {
          throw new Error(`Pedido '${orderId}' no encontrado en el tenant '${tenantId}'.`);
        }

        // Si ya está pagado con este identificador, devolver sin cambios (idempotente)
        if (order.status === OrderStatus.PAID && order.paymentVerificationId === verificationId) {
          return order;
        }

        if (order.status === OrderStatus.CANCELLED) {
          throw new Error(`No se puede confirmar el pago de un pedido cancelado (${order.orderNumber}).`);
        }

        return tx.storeOrder.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentVerificationStatus.VERIFIED,
            paymentVerificationId: verificationId,
          },
          include: { items: true },
        });
      });
    });
  }

  /**
   * Cancelación de pedido y liberación atómica de inventario en PostgreSQL.
   */
  public async cancelOrderAndReleaseStock(tenantId: string, orderId: string, reason?: string) {
    return executeWithDatabase(async () => {
      return prisma.$transaction(async (tx) => {
        const order = await tx.storeOrder.findFirst({
          where: { id: orderId, tenantId },
          include: { items: true },
        });

        if (!order) {
          throw new Error(`Pedido '${orderId}' no encontrado.`);
        }

        if (order.status === OrderStatus.CANCELLED) {
          return order; // Idempotente
        }

        // Devolver unidades reservadas al catálogo de productos
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }
        }

        return tx.storeOrder.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            notes: reason ? `${order.notes || ''} [Cancelado: ${reason}]`.trim() : order.notes,
          },
          include: { items: true },
        });
      });
    });
  }

  /**
   * Reembolso de pedido.
   */
  public async refundOrder(tenantId: string, orderId: string, reason?: string) {
    return executeWithDatabase(async () => {
      return prisma.storeOrder.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
          notes: reason ? `[Reembolsado: ${reason}]` : undefined,
        },
        include: { items: true },
      });
    });
  }

  /**
   * Actualización genérica de estado del pedido.
   */
  public async updateStatus(tenantId: string, id: string, status: OrderStatus) {
    return executeWithDatabase(async () => {
      const existing = await prisma.storeOrder.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Pedido no encontrado o no pertenece a este tenant.');
      }

      return prisma.storeOrder.update({
        where: { id },
        data: { status },
        include: { items: true },
      });
    });
  }

  /**
   * Prohibición absoluta de borrado de pedidos (integridad contable inmutable).
   */
  public async delete(tenantId: string, id: string): Promise<never> {
    throw new Error(
      `Operación no permitida: Los pedidos son registros contables y fiscales inmutables. El pedido '${id}' no puede eliminarse del tenant '${tenantId}'. Utilice el estado CANCELLED o REFUNDED.`
    );
  }
}

export const orderRepository = new OrderRepository();

