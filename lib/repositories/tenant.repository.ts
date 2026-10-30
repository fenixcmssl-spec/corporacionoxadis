// ============================================================================
// FENIXCMS SAAS — REPOSITORIO PERSISTENTE DE TENANTS Y DOMINIOS
// FASE 2 BIS.2: ORGANIZACIONES CLIENTES, MULTIDOMINIO Y PLANES EN POSTGRESQL
// ============================================================================

import { prisma, executeWithDatabase } from '../db/prisma';
import { Prisma, TenantStatus, DomainVerificationStatus, SslStatus } from '@prisma/client';

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  status?: TenantStatus;
  search?: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  planSlug: string;
  adminEmail: string;
}

export class TenantRepository {
  /**
   * Consulta paginada de tenants en base de datos.
   */
  public async list(params?: TenantListParams) {
    return executeWithDatabase(async () => {
      const page = Math.max(1, params?.page || 1);
      const pageSize = Math.max(1, Math.min(100, params?.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.TenantWhereInput = {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { slug: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            plan: true,
            domains: true,
          },
        }),
        prisma.tenant.count({ where }),
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
   * Consulta de tenant por ID con dominios y plan.
   */
  public async findById(id: string) {
    return executeWithDatabase(async () => {
      return prisma.tenant.findUnique({
        where: { id },
        include: {
          plan: {
            include: {
              modules: { include: { module: true } },
              limits: true,
            },
          },
          domains: true,
          languages: true,
          themes: true,
        },
      });
    });
  }

  /**
   * Consulta de tenant por subdominio slug.
   */
  public async findBySlug(slug: string) {
    return executeWithDatabase(async () => {
      return prisma.tenant.findUnique({
        where: { slug },
        include: {
          plan: {
            include: {
              modules: { include: { module: true } },
            },
          },
          domains: true,
        },
      });
    });
  }

  /**
   * Resolución de tenant a partir de hostname verificado.
   */
  public async findByHostname(hostname: string) {
    return executeWithDatabase(async () => {
      const cleanHost = hostname.toLowerCase().trim();

      // 1. Buscar en dominios registrados
      const domain = await prisma.domain.findUnique({
        where: { hostname: cleanHost },
        include: {
          tenant: {
            include: {
              plan: {
                include: {
                  modules: { include: { module: true } },
                },
              },
              domains: true,
            },
          },
        },
      });

      if (domain) {
        return {
          tenant: domain.tenant,
          domain,
          isVerified: domain.verificationStatus === DomainVerificationStatus.VERIFIED,
        };
      }

      // 2. Si es subdominio fenixcms.app (e.g. modaurbana.fenixcms.app)
      if (cleanHost.endsWith('.fenixcms.app')) {
        const slug = cleanHost.replace('.fenixcms.app', '');
        const tenant = await prisma.tenant.findUnique({
          where: { slug },
          include: {
            plan: {
              include: {
                modules: { include: { module: true } },
              },
            },
            domains: true,
          },
        });

        if (tenant) {
          return {
            tenant,
            domain: tenant.domains.find((d) => d.isPrimary) || null,
            isVerified: true,
          };
        }
      }

      return null;
    });
  }

  /**
   * Creación persistente de tenant con plan, dominio inicial, idioma y tema.
   */
  public async create(input: CreateTenantInput) {
    return executeWithDatabase(async () => {
      // Buscar o asignar plan
      let plan = await prisma.plan.findUnique({
        where: { slug: input.planSlug },
      });

      if (!plan) {
        plan = await prisma.plan.findFirst();
      }

      if (!plan) {
        throw new Error('No existe ningún plan de suscripción en el sistema para asociar al nuevo tenant.');
      }

      return prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug: input.slug,
            status: TenantStatus.ACTIVE,
            planId: plan.id,
            domains: {
              create: [
                {
                  hostname: `${input.slug}.fenixcms.app`,
                  isPrimary: true,
                  verificationStatus: DomainVerificationStatus.VERIFIED,
                  verifiedAt: new Date(),
                  sslStatus: SslStatus.ACTIVE,
                  sslIssuedAt: new Date(),
                },
              ],
            },
            languages: {
              create: [
                { code: 'es', name: 'Español', isDefault: true, isEnabled: true },
                { code: 'en', name: 'English', isDefault: false, isEnabled: true },
              ],
            },
            themes: {
              create: [
                {
                  slug: 'fenix-dark-crimson',
                  name: 'Fénix Carbon & Crimson',
                  isActive: true,
                  previewColor: '#dc2626',
                  description: 'Tema estándar FenixCMS con acentos carmesí y bordes pulidos.',
                },
              ],
            },
          },
          include: {
            plan: true,
            domains: true,
            languages: true,
            themes: true,
          },
        });

        return tenant;
      });
    });
  }

  /**
   * Registro de dominio adicional para un tenant.
   */
  public async addDomain(tenantId: string, hostname: string) {
    return executeWithDatabase(async () => {
      const cleanHost = hostname.toLowerCase().trim();
      const existing = await prisma.domain.findUnique({
        where: { hostname: cleanHost },
      });

      if (existing) {
        throw new Error(`El dominio '${cleanHost}' ya está registrado en la plataforma.`);
      }

      return prisma.domain.create({
        data: {
          tenantId,
          hostname: cleanHost,
          isPrimary: false,
          verificationStatus: DomainVerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          sslStatus: SslStatus.ACTIVE,
        },
      });
    });
  }

  /**
   * Obtiene la lista de dominios de un tenant.
   */
  public async getDomains(tenantId: string) {
    return executeWithDatabase(async () => {
      return prisma.domain.findMany({
        where: { tenantId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
    });
  }
}

export const tenantRepository = new TenantRepository();
