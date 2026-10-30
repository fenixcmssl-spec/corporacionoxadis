// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE PRODUCTOS (ECOMMERCE)
// FASE 2 BIS.2: ALMACENAMIENTO Y CONSULTAS EN POSTGRESQL VÍA PRISMA
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma } from '@prisma/client';

export interface ProductListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  publishedOnly?: boolean;
  search?: string;
}

export interface CreateProductInput {
  sku: string;
  title: string;
  slug?: string;
  description: string;
  price: number;
  comparePrice?: number;
  currency?: string;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  isPublished?: boolean;
  featured?: boolean;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  comparePrice?: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  isPublished?: boolean;
  featured?: boolean;
}

export class ProductRepository {
  /**
   * Consulta paginada con filtrado obligatorio por tenant en el motor PostgreSQL.
   */
  public async list(params: ProductListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.ProductWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.search
          ? {
              OR: [
                { title: { contains: params.search, mode: 'insensitive' } },
                { sku: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
          },
        }),
        prisma.product.count({ where }),
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
   * Consulta por identificador con validación estricta de pertenencia al tenant.
   */
  public async findById(tenantId: string, id: string, publishedOnly = false) {
    return executeWithDatabase(async () => {
      return prisma.product.findFirst({
        where: {
          id,
          tenantId,
          ...(publishedOnly ? { isPublished: true } : {}),
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  /**
   * Consulta por SKU dentro del tenant.
   */
  public async findBySku(tenantId: string, sku: string) {
    return executeWithDatabase(async () => {
      return prisma.product.findFirst({
        where: { tenantId, sku },
        include: { category: true, images: true },
      });
    });
  }

  /**
   * Consulta por slug dentro del tenant.
   */
  public async findBySlug(tenantId: string, slug: string, publishedOnly = false) {
    return executeWithDatabase(async () => {
      return prisma.product.findFirst({
        where: {
          tenantId,
          slug,
          ...(publishedOnly ? { isPublished: true } : {}),
        },
        include: { category: true, images: true },
      });
    });
  }

  /**
   * Creación de producto con precio en Decimal y aislamiento de tenant.
   */
  public async create(tenantId: string, input: CreateProductInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return prisma.product.create({
        data: {
          tenantId,
          sku: input.sku,
          title: input.title,
          slug: `${slug}-${Date.now()}`,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          comparePrice: input.comparePrice !== undefined ? new Prisma.Decimal(input.comparePrice) : null,
          currency: input.currency || 'EUR',
          stock: input.stock !== undefined ? input.stock : 0,
          categoryId: input.categoryId || null,
          isPublished: input.isPublished ?? true,
          featured: input.featured ?? false,
          ...(input.imageUrl
            ? {
                images: {
                  create: [
                    {
                      url: input.imageUrl,
                      alt: input.title,
                      sortOrder: 0,
                    },
                  ],
                },
              }
            : {}),
        },
        include: { category: true, images: true },
      });
    });
  }

  /**
   * Actualización de datos del producto verificando pertenencia al tenant.
   */
  public async update(tenantId: string, id: string, input: UpdateProductInput) {
    return executeWithDatabase(async () => {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Producto no encontrado o no pertenece a este tenant.');
      }

      return prisma.product.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
          ...(input.comparePrice !== undefined
            ? { comparePrice: input.comparePrice !== null ? new Prisma.Decimal(input.comparePrice) : null }
            : {}),
          ...(input.stock !== undefined ? { stock: input.stock } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
          ...(input.featured !== undefined ? { featured: input.featured } : {}),
        },
        include: { category: true, images: true },
      });
    });
  }

  /**
   * Publicar o despublicar producto.
   */
  public async setPublished(tenantId: string, id: string, isPublished: boolean) {
    return this.update(tenantId, id, { isPublished });
  }

  /**
   * Eliminación protegida: no se permite eliminar si existen pedidos asociados.
   */
  public async delete(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId },
        include: { orderItems: { select: { id: true } } },
      });

      if (!existing) {
        throw new Error('Producto no encontrado o no pertenece a este tenant.');
      }

      if (existing.orderItems.length > 0) {
        throw new Error(
          'Eliminación bloqueada por integridad contable: El producto tiene pedidos asociados. Debe ser despublicado en lugar de eliminado.'
        );
      }

      return prisma.product.delete({
        where: { id },
      });
    });
  }
}

export const productRepository = new ProductRepository();
