// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE INMOBILIARIO
// FASE 2 BIS.2: PROPIEDADES, CONSULTAS Y GALERÍAS EN POSTGRESQL VÍA PRISMA
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, PropertyOperation, PropertyType } from '@prisma/client';

export interface PropertyListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  operation?: PropertyOperation;
  propertyType?: PropertyType;
  city?: string;
  publishedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreatePropertyInput {
  title: string;
  slug?: string;
  description: string;
  operation?: PropertyOperation;
  propertyType?: PropertyType;
  price: number;
  currency?: string;
  surfaceM2: number;
  bedrooms?: number;
  bathrooms?: number;
  address?: string;
  city: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
  imageUrl?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdatePropertyInput {
  title?: string;
  description?: string;
  operation?: PropertyOperation;
  propertyType?: PropertyType;
  price?: number;
  surfaceM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  features?: string[];
  imageUrl?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export class PropertyRepository {
  /**
   * Consulta paginada con filtrado estricto por tenant.
   */
  public async list(params: PropertyListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.RealEstatePropertyWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true } : {}),
        ...(params.operation ? { operation: params.operation } : {}),
        ...(params.propertyType ? { propertyType: params.propertyType } : {}),
        ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
        ...(params.minPrice || params.maxPrice
          ? {
              price: {
                ...(params.minPrice ? { gte: new Prisma.Decimal(params.minPrice) } : {}),
                ...(params.maxPrice ? { lte: new Prisma.Decimal(params.maxPrice) } : {}),
              },
            }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.realEstateProperty.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
          },
        }),
        prisma.realEstateProperty.count({ where }),
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
   * Consulta por slug dentro del tenant.
   */
  public async findBySlug(tenantId: string, slug: string, publishedOnly = false) {
    return executeWithDatabase(async () => {
      return prisma.realEstateProperty.findFirst({
        where: {
          tenantId,
          slug,
          ...(publishedOnly ? { isPublished: true } : {}),
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  /**
   * Consulta por ID dentro del tenant.
   */
  public async findById(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      return prisma.realEstateProperty.findFirst({
        where: { id, tenantId },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          inquiries: true,
        },
      });
    });
  }

  /**
   * Creación de inmueble.
   */
  public async create(tenantId: string, input: CreatePropertyInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return prisma.realEstateProperty.create({
        data: {
          tenantId,
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          description: input.description,
          operation: input.operation || PropertyOperation.SALE,
          propertyType: input.propertyType || PropertyType.APARTMENT,
          price: new Prisma.Decimal(input.price),
          currency: input.currency || 'EUR',
          surfaceM2: new Prisma.Decimal(input.surfaceM2),
          bedrooms: input.bedrooms || null,
          bathrooms: input.bathrooms || null,
          address: input.address || null,
          city: input.city,
          province: input.province || null,
          postalCode: input.postalCode || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          featuresJson: input.features ? JSON.stringify(input.features) : null,
          isPublished: input.isPublished ?? false,
          isFeatured: input.isFeatured ?? false,
          contactName: input.contactName || null,
          contactPhone: input.contactPhone || null,
          contactEmail: input.contactEmail || null,
          publishedAt: input.isPublished ? new Date() : null,
          ...(input.imageUrl
            ? {
                images: {
                  create: [
                    {
                      url: input.imageUrl,
                      title: input.title,
                      isFeatured: true,
                      sortOrder: 0,
                    },
                  ],
                },
              }
            : {}),
        },
        include: { images: true },
      });
    });
  }

  /**
   * Actualización de inmueble.
   */
  public async update(tenantId: string, id: string, input: UpdatePropertyInput) {
    return executeWithDatabase(async () => {
      const existing = await prisma.realEstateProperty.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Propiedad no encontrada o no pertenece a este tenant.');
      }

      return prisma.realEstateProperty.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.operation !== undefined ? { operation: input.operation } : {}),
          ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
          ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
          ...(input.surfaceM2 !== undefined ? { surfaceM2: new Prisma.Decimal(input.surfaceM2) } : {}),
          ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
          ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.features !== undefined ? { featuresJson: JSON.stringify(input.features) } : {}),
          ...(input.isPublished !== undefined
            ? {
                isPublished: input.isPublished,
                publishedAt: input.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
              }
            : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        },
        include: { images: true },
      });
    });
  }

  /**
   * Publicar o despublicar inmueble.
   */
  public async setPublished(tenantId: string, id: string, isPublished: boolean) {
    return this.update(tenantId, id, { isPublished });
  }

  /**
   * Registro de solicitud de información (inquiry).
   */
  public async createInquiry(
    tenantId: string,
    propertyId: string,
    data: { name: string; email: string; phone?: string; message: string }
  ) {
    return executeWithDatabase(async () => {
      const property = await prisma.realEstateProperty.findFirst({
        where: { id: propertyId, tenantId },
      });
      if (!property) {
        throw new Error('Propiedad no encontrada o no pertenece a este tenant.');
      }

      return prisma.propertyInquiry.create({
        data: {
          propertyId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          message: data.message,
        },
      });
    });
  }

  /**
   * Eliminación de inmueble.
   */
  public async delete(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.realEstateProperty.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Propiedad no encontrada o no pertenece a este tenant.');
      }

      return prisma.realEstateProperty.delete({ where: { id } });
    });
  }
}

export const propertyRepository = new PropertyRepository();
