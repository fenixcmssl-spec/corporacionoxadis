// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE ANUNCIOS (CLASIFICADOS Y PERSONALES)
// FASE 2 BIS.2: MODERACIÓN, REGLAS DE VISIBILIDAD Y PRIVACIDAD RIGUROSA EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, ClassifiedCondition, ModerationStatus } from '@prisma/client';

export interface ClassifiedListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  category?: string;
  publishedOnly?: boolean;
  moderationStatus?: ModerationStatus;
  city?: string;
}

export interface CreateClassifiedInput {
  title: string;
  slug?: string;
  description: string;
  category: string;
  price?: number;
  condition?: ClassifiedCondition;
  location: string;
  city?: string;
  region?: string;
  imageUrl?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  isPublished?: boolean;
}

export interface PersonalListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  category?: string;
  city?: string;
  publishedOnly?: boolean;
  moderationStatus?: ModerationStatus;
  includePrivate?: boolean;
}

export interface CreatePersonalInput {
  title: string;
  slug?: string;
  description: string;
  category: string;
  age?: number;
  city: string;
  zone?: string;
  interests?: string[];
  imageUrl?: string;
  publicContactAlias: string;
  publicContactMethod?: string;
  privateContactInfo?: string;
  isPublished?: boolean;
}

export class AdRepository {
  // --------------------------------------------------------------------------
  // ANUNCIOS CLASIFICADOS
  // --------------------------------------------------------------------------

  public async listClassifieds(params: ClassifiedListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.ClassifiedAdWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true, moderationStatus: ModerationStatus.APPROVED } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
        ...(params.moderationStatus ? { moderationStatus: params.moderationStatus } : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.classifiedAd.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.classifiedAd.count({ where }),
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

  public async findClassifiedBySlug(tenantId: string, slug: string, publishedOnly = false) {
    return executeWithDatabase(async () => {
      return prisma.classifiedAd.findFirst({
        where: {
          tenantId,
          slug,
          ...(publishedOnly ? { isPublished: true, moderationStatus: ModerationStatus.APPROVED } : {}),
        },
      });
    });
  }

  public async createClassified(tenantId: string, input: CreateClassifiedInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return prisma.classifiedAd.create({
        data: {
          tenantId,
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          description: input.description,
          category: input.category,
          price: input.price !== undefined ? new Prisma.Decimal(input.price) : null,
          condition: input.condition || ClassifiedCondition.GOOD,
          location: input.location,
          city: input.city || null,
          region: input.region || null,
          imagesJson: input.imageUrl ? JSON.stringify([input.imageUrl]) : null,
          ownerName: input.ownerName,
          ownerPhone: input.ownerPhone || null,
          ownerEmail: input.ownerEmail || null,
          isPublished: input.isPublished ?? false,
          moderationStatus: ModerationStatus.PENDING,
          publishedAt: input.isPublished ? new Date() : null,
        },
      });
    });
  }

  public async moderateClassified(
    tenantId: string,
    id: string,
    status: ModerationStatus,
    notes?: string
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.classifiedAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio clasificado no encontrado o no pertenece a este tenant.');
      }

      return prisma.classifiedAd.update({
        where: { id },
        data: {
          moderationStatus: status,
          moderationNotes: notes || null,
          isPublished: status === ModerationStatus.APPROVED ? existing.isPublished : false,
        },
      });
    });
  }

  public async updateClassified(
    tenantId: string,
    id: string,
    input: Partial<CreateClassifiedInput> & { isPublished?: boolean; moderationStatus?: ModerationStatus }
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.classifiedAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio clasificado no encontrado o no pertenece a este tenant.');
      }

      return prisma.classifiedAd.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
          ...(input.condition !== undefined ? { condition: input.condition } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.region !== undefined ? { region: input.region } : {}),
          ...(input.imageUrl !== undefined ? { imagesJson: JSON.stringify([input.imageUrl]) } : {}),
          ...(input.ownerName !== undefined ? { ownerName: input.ownerName } : {}),
          ...(input.ownerPhone !== undefined ? { ownerPhone: input.ownerPhone } : {}),
          ...(input.ownerEmail !== undefined ? { ownerEmail: input.ownerEmail } : {}),
          ...(input.isPublished !== undefined
            ? {
                isPublished: input.isPublished,
                publishedAt: input.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
              }
            : {}),
          ...(input.moderationStatus !== undefined ? { moderationStatus: input.moderationStatus } : {}),
        },
      });
    });
  }

  public async withdrawClassified(tenantId: string, id: string) {
    return this.updateClassified(tenantId, id, { isPublished: false });
  }

  public async deleteClassified(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.classifiedAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio no encontrado o no pertenece a este tenant.');
      }

      return prisma.classifiedAd.delete({ where: { id } });
    });
  }

  // --------------------------------------------------------------------------
  // ANUNCIOS PERSONALES (ESTRICTA PRIVACIDAD Y PROTECCIÓN DE DATOS DE CONTACTO)
  // --------------------------------------------------------------------------

  public async listPersonals(params: PersonalListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.PersonalAdWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true, moderationStatus: ModerationStatus.APPROVED } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
        ...(params.moderationStatus ? { moderationStatus: params.moderationStatus } : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.personalAd.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.personalAd.count({ where }),
      ]);

      // Filtrar y proteger estrictamente los datos de contacto si no es consulta administrativa
      const sanitizedItems = items.map((ad) => {
        if (!params.includePrivate) {
          const { privateContactInfo, ...safeFields } = ad;
          return safeFields;
        }
        return ad;
      });

      return {
        items: sanitizedItems,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    });
  }

  public async findPersonalBySlug(tenantId: string, slug: string, includePrivate = false) {
    return executeWithDatabase(async () => {
      const ad = await prisma.personalAd.findFirst({
        where: {
          tenantId,
          slug,
          ...(!includePrivate ? { isPublished: true, moderationStatus: ModerationStatus.APPROVED } : {}),
        },
      });

      if (!ad) return null;

      if (!includePrivate) {
        const { privateContactInfo, ...safeFields } = ad;
        return safeFields;
      }
      return ad;
    });
  }

  public async createPersonal(tenantId: string, input: CreatePersonalInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const ad = await prisma.personalAd.create({
        data: {
          tenantId,
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          description: input.description,
          category: input.category,
          age: input.age || null,
          city: input.city,
          zone: input.zone || null,
          interestsJson: input.interests ? JSON.stringify(input.interests) : null,
          imageUrl: input.imageUrl || null,
          publicContactAlias: input.publicContactAlias,
          publicContactMethod: input.publicContactMethod || 'FORMULARIO_INTERNO',
          privateContactInfo: input.privateContactInfo || null,
          isPublished: input.isPublished ?? false,
          moderationStatus: ModerationStatus.PENDING,
          publishedAt: input.isPublished ? new Date() : null,
        },
      });

      // Nunca devolver información privada en la respuesta pública por defecto
      const { privateContactInfo, ...safeAd } = ad;
      return safeAd;
    });
  }

  public async moderatePersonal(
    tenantId: string,
    id: string,
    status: ModerationStatus,
    notes?: string
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.personalAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio personal no encontrado o no pertenece a este tenant.');
      }

      return prisma.personalAd.update({
        where: { id },
        data: {
          moderationStatus: status,
          moderationNotes: notes || null,
          isPublished: status === ModerationStatus.APPROVED ? existing.isPublished : false,
        },
      });
    });
  }

  public async updatePersonal(
    tenantId: string,
    id: string,
    input: Partial<CreatePersonalInput> & { isPublished?: boolean; moderationStatus?: ModerationStatus },
    includePrivate = false
  ) {
    return executeWithDatabase(async () => {
      const existing = await prisma.personalAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio personal no encontrado o no pertenece a este tenant.');
      }

      const updated = await prisma.personalAd.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.age !== undefined ? { age: input.age } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.zone !== undefined ? { zone: input.zone } : {}),
          ...(input.interests !== undefined ? { interestsJson: JSON.stringify(input.interests) } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.publicContactAlias !== undefined ? { publicContactAlias: input.publicContactAlias } : {}),
          ...(input.publicContactMethod !== undefined ? { publicContactMethod: input.publicContactMethod } : {}),
          ...(input.privateContactInfo !== undefined ? { privateContactInfo: input.privateContactInfo } : {}),
          ...(input.isPublished !== undefined
            ? {
                isPublished: input.isPublished,
                publishedAt: input.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
              }
            : {}),
          ...(input.moderationStatus !== undefined ? { moderationStatus: input.moderationStatus } : {}),
        },
      });

      if (!includePrivate) {
        const { privateContactInfo, ...safeUpdated } = updated;
        return safeUpdated;
      }
      return updated;
    });
  }

  public async withdrawPersonal(tenantId: string, id: string) {
    return this.updatePersonal(tenantId, id, { isPublished: false });
  }

  public async deletePersonal(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.personalAd.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Anuncio personal no encontrado o no pertenece a este tenant.');
      }

      return prisma.personalAd.delete({ where: { id } });
    });
  }
}

export const adRepository = new AdRepository();
