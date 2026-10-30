// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE BLOG
// FASE 2 BIS.2: PUBLICACIONES, CATEGORÍAS Y METADATOS SEO EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma } from '@prisma/client';
import { sanitizeHtml } from '../security/html-sanitizer';

export interface BlogListParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  publishedOnly?: boolean;
  search?: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  authorName?: string;
  categoryId?: string;
  isPublished?: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

export interface UpdateBlogPostInput {
  title?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  authorName?: string;
  categoryId?: string;
  isPublished?: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

export class BlogRepository {
  /**
   * Consulta paginada con aislamiento estricto por tenant.
   */
  public async list(params: BlogListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.BlogPostWhereInput = {
        tenantId: params.tenantId,
        ...(params.publishedOnly ? { isPublished: true } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.search
          ? {
              OR: [
                { title: { contains: params.search, mode: 'insensitive' } },
                { excerpt: { contains: params.search, mode: 'insensitive' } },
                { content: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            tags: { include: { tag: true } },
          },
        }),
        prisma.blogPost.count({ where }),
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
      return prisma.blogPost.findFirst({
        where: {
          tenantId,
          slug,
          ...(publishedOnly ? { isPublished: true } : {}),
        },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      });
    });
  }

  /**
   * Consulta por ID dentro del tenant.
   */
  public async findById(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      return prisma.blogPost.findFirst({
        where: { id, tenantId },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      });
    });
  }

  /**
   * Creación de artículo.
   */
  public async create(tenantId: string, input: CreateBlogPostInput) {
    return executeWithDatabase(async () => {
      const slug =
        input.slug ||
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return prisma.blogPost.create({
        data: {
          tenantId,
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          excerpt: input.excerpt ? sanitizeHtml(input.excerpt) : null,
          content: sanitizeHtml(input.content),
          coverImage: input.coverImage || null,
          authorName: input.authorName || 'Redacción',
          categoryId: input.categoryId || null,
          isPublished: input.isPublished ?? false,
          publishedAt: input.publishedAt || (input.isPublished ? new Date() : null),
          metaTitle: input.metaTitle || input.title,
          metaDescription: input.metaDescription || input.excerpt || null,
          canonicalUrl: input.canonicalUrl || null,
        },
        include: { category: true },
      });
    });
  }

  /**
   * Actualización de artículo.
   */
  public async update(tenantId: string, id: string, input: UpdateBlogPostInput) {
    return executeWithDatabase(async () => {
      const existing = await prisma.blogPost.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Artículo no encontrado o no pertenece a este tenant.');
      }

      return prisma.blogPost.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.excerpt !== undefined ? { excerpt: input.excerpt ? sanitizeHtml(input.excerpt) : null } : {}),
          ...(input.content !== undefined ? { content: sanitizeHtml(input.content) } : {}),
          ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
          ...(input.authorName !== undefined ? { authorName: input.authorName } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.isPublished !== undefined
            ? {
                isPublished: input.isPublished,
                publishedAt: input.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
              }
            : {}),
          ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
          ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
          ...(input.canonicalUrl !== undefined ? { canonicalUrl: input.canonicalUrl } : {}),
        },
        include: { category: true },
      });
    });
  }

  /**
   * Publicar o despublicar artículo.
   */
  public async setPublished(tenantId: string, id: string, isPublished: boolean) {
    return this.update(tenantId, id, { isPublished });
  }

  /**
   * Eliminación de artículo.
   */
  public async delete(tenantId: string, id: string) {
    return executeWithDatabase(async () => {
      const existing = await prisma.blogPost.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new Error('Artículo no encontrado o no pertenece a este tenant.');
      }

      return prisma.blogPost.delete({ where: { id } });
    });
  }
}

export const blogRepository = new BlogRepository();
