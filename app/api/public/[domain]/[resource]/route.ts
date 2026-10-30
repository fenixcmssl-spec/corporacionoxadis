// ============================================================================
// FENIXCMS SAAS — ENDPOINTS PÚBLICOS DE TIENDA Y MÓDULOS DE CLIENTE
// FASE 2 BIS.6: PERSISTENCIA COMPLETA, FILTROS SERVER-SIDE, PRIVACIDAD Y REPORTES
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantByHostname } from '../../../../../lib/tenancy/resolver';
import { fenixDb } from '../../../../../lib/db/client';
import { DatabaseConnectionError } from '../../../../../lib/db/prisma';
import { FenixModuleType } from '../../../../../lib/types/fenix';
import {
  orderCreationSchema,
  auctionBidSchema,
  propertyInquirySchema,
  contentReportSchema,
} from '../../../../../lib/security/validators';
import {
  orderRepository,
  blogRepository,
  propertyRepository,
  adRepository,
  contactRepository,
} from '../../../../../lib/repositories';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string; resource: string }> }
) {
  try {
    const { domain, resource } = await params;
    const searchParams = req.nextUrl.searchParams;
    const itemSlug = searchParams.get('slug');
    const itemId = searchParams.get('id');

    // 1. Resolución estricta del dominio registrado y verificado
    const resolution = resolveTenantByHostname(domain);
    if (!resolution.success) {
      return NextResponse.json(
        {
          success: false,
          error: resolution.error,
          message: resolution.message,
        },
        { status: resolution.error === 'DOMAIN_NOT_REGISTERED' ? 404 : 403 }
      );
    }

    const tenant = resolution.tenant;

    // 2. Consulta de configuración y módulos del tenant
    if (resource === 'info') {
      const modules = fenixDb.getTenantModules(tenant.id);
      return NextResponse.json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          planName: tenant.planName,
          customDomain: tenant.customDomain,
          activeModules: modules,
          branding: tenant.branding,
        },
      });
    }

    // 3. ECOMMERCE (CATÁLOGO DE PRODUCTOS)
    if (resource === 'products') {
      if (itemSlug || itemId) {
        const prod = itemId
          ? fenixDb.getProductById(tenant.id, itemId)
          : fenixDb.getProducts(tenant.id).find((p) => p.slug === itemSlug);

        if (!prod) {
          return NextResponse.json(
            { success: false, error: 'Producto no encontrado o no pertenece a este tenant.' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, product: prod });
      }

      const products = fenixDb.getProducts(tenant.id);
      return NextResponse.json({ success: true, count: products.length, products });
    }

    // 4. BLOG (Exclusivamente artículos publicados, borradores prohibidos)
    if (resource === 'blog') {
      if (!fenixDb.isModuleAuthorized(tenant.id, 'blog')) {
        return NextResponse.json(
          { success: false, error: 'El módulo de Blog no está contratado ni autorizado para este tenant.' },
          { status: 403 }
        );
      }

      if (itemSlug) {
        try {
          const post = await blogRepository.findBySlug(tenant.id, itemSlug, true);
          if (!post) {
            return NextResponse.json(
              { success: false, error: 'Artículo no encontrado o no publicado.' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, post });
        } catch (err) {
          if (err instanceof DatabaseConnectionError) {
            const post = fenixDb.getBlogPostBySlug(tenant.id, itemSlug);
            if (!post) {
              return NextResponse.json(
                { success: false, error: 'Artículo no encontrado o no pertenece a este tenant.' },
                { status: 404 }
              );
            }
            return NextResponse.json({ success: true, post });
          }
          throw err;
        }
      }

      try {
        const result = await blogRepository.list({ tenantId: tenant.id, publishedOnly: true });
        return NextResponse.json({ success: true, count: result.items.length, posts: result.items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const posts = fenixDb.getBlogPosts(tenant.id);
          return NextResponse.json({ success: true, count: posts.length, posts });
        }
        throw err;
      }
    }

    // 5. INMOBILIARIA (Filtros server-side: localización, operación y precio)
    if (resource === 'inmobiliaria') {
      if (!fenixDb.isModuleAuthorized(tenant.id, 'inmobiliaria')) {
        return NextResponse.json(
          { success: false, error: 'El módulo Inmobiliario no está contratado ni autorizado para este tenant.' },
          { status: 403 }
        );
      }

      if (itemSlug) {
        try {
          const property = await propertyRepository.findBySlug(tenant.id, itemSlug, true);
          if (!property) {
            return NextResponse.json(
              { success: false, error: 'Propiedad no encontrada o no publicada.' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, property });
        } catch (err) {
          if (err instanceof DatabaseConnectionError) {
            const property = fenixDb.getPropertyBySlug(tenant.id, itemSlug);
            if (!property) {
              return NextResponse.json(
                { success: false, error: 'Propiedad no encontrada o no pertenece a este tenant.' },
                { status: 404 }
              );
            }
            return NextResponse.json({ success: true, property });
          }
          throw err;
        }
      }

      const city = searchParams.get('city') || undefined;
      const opParam = searchParams.get('operation')?.toUpperCase();
      const operation = opParam === 'VENTA' || opParam === 'SALE' ? 'SALE' : opParam === 'ALQUILER' || opParam === 'RENT' ? 'RENT' : undefined;
      const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
      const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

      try {
        const result = await propertyRepository.list({
          tenantId: tenant.id,
          publishedOnly: true,
          city,
          operation: operation as any,
          minPrice,
          maxPrice,
        });
        return NextResponse.json({ success: true, count: result.items.length, properties: result.items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          let properties = fenixDb.getProperties(tenant.id);
          if (operation) {
            const opCompare = operation === 'SALE' ? 'VENTA' : 'ALQUILER';
            properties = properties.filter((p) => p.operation === opCompare);
          }
          if (city) {
            properties = properties.filter((p) => p.city.toLowerCase().includes(city.toLowerCase()));
          }
          if (minPrice) {
            properties = properties.filter((p) => p.price >= minPrice);
          }
          if (maxPrice) {
            properties = properties.filter((p) => p.price <= maxPrice);
          }
          return NextResponse.json({ success: true, count: properties.length, properties });
        }
        throw err;
      }
    }

    // 6. SUBASTAS
    if (resource === 'subastas') {
      if (!fenixDb.isModuleAuthorized(tenant.id, 'subastas')) {
        return NextResponse.json(
          { success: false, error: 'El módulo de Subastas no está contratado ni autorizado para este tenant.' },
          { status: 403 }
        );
      }

      if (itemSlug) {
        const auction = fenixDb.getAuctionBySlug(tenant.id, itemSlug);
        if (!auction) {
          return NextResponse.json(
            { success: false, error: 'Lote de subasta no encontrado o no pertenece a este tenant.' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, auction });
      }

      const auctions = fenixDb.getAuctions(tenant.id);
      return NextResponse.json({ success: true, count: auctions.length, auctions });
    }

    // 7. ANUNCIOS CLASIFICADOS
    if (resource === 'clasificados') {
      if (!fenixDb.isModuleAuthorized(tenant.id, 'clasificados')) {
        return NextResponse.json(
          { success: false, error: 'El módulo de Anuncios Clasificados no está contratado ni autorizado para este tenant.' },
          { status: 403 }
        );
      }

      if (itemSlug) {
        try {
          const classified = await adRepository.findClassifiedBySlug(tenant.id, itemSlug, true);
          if (!classified) {
            return NextResponse.json(
              { success: false, error: 'Anuncio clasificado no encontrado o no publicado.' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, classified });
        } catch (err) {
          if (err instanceof DatabaseConnectionError) {
            const classified = fenixDb.getClassifiedBySlug(tenant.id, itemSlug);
            if (!classified) {
              return NextResponse.json(
                { success: false, error: 'Anuncio clasificado no encontrado o no pertenece a este tenant.' },
                { status: 404 }
              );
            }
            return NextResponse.json({ success: true, classified });
          }
          throw err;
        }
      }

      try {
        const result = await adRepository.listClassifieds({ tenantId: tenant.id, publishedOnly: true });
        return NextResponse.json({ success: true, count: result.items.length, classifieds: result.items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const classifieds = fenixDb.getClassifiedAds(tenant.id);
          return NextResponse.json({ success: true, count: classifieds.length, classifieds });
        }
        throw err;
      }
    }

    // 8. ANUNCIOS PERSONALES (Privacidad por defecto: privateContactInfo OMITIDO siempre)
    if (resource === 'personales') {
      if (!fenixDb.isModuleAuthorized(tenant.id, 'personales')) {
        return NextResponse.json(
          { success: false, error: 'El módulo de Anuncios Personales no está contratado ni autorizado para este tenant.' },
          { status: 403 }
        );
      }

      if (itemSlug) {
        try {
          const personal = await adRepository.findPersonalBySlug(tenant.id, itemSlug, false);
          if (!personal) {
            return NextResponse.json(
              { success: false, error: 'Anuncio personal no encontrado o no publicado.' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, personal });
        } catch (err) {
          if (err instanceof DatabaseConnectionError) {
            const personal = fenixDb.getPersonalAdBySlug(tenant.id, itemSlug);
            if (!personal) {
              return NextResponse.json(
                { success: false, error: 'Anuncio personal no encontrado o no pertenece a este tenant.' },
                { status: 404 }
              );
            }
            return NextResponse.json({ success: true, personal });
          }
          throw err;
        }
      }

      try {
        const result = await adRepository.listPersonals({ tenantId: tenant.id, publishedOnly: true, includePrivate: false });
        return NextResponse.json({ success: true, count: result.items.length, personals: result.items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const personals = fenixDb.getPersonalAds(tenant.id);
          return NextResponse.json({ success: true, count: personals.length, personals });
        }
        throw err;
      }
    }

    return NextResponse.json(
      { success: false, error: `Recurso '${resource}' desconocido o no implementado.` },
      { status: 404 }
    );
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_UNAVAILABLE', message: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string; resource: string }> }
) {
  try {
    const { domain, resource } = await params;

    // Resolución estricta del dominio
    const resolution = resolveTenantByHostname(domain);
    if (!resolution.success) {
      return NextResponse.json(
        { success: false, error: resolution.error, message: resolution.message },
        { status: resolution.error === 'DOMAIN_NOT_REGISTERED' ? 404 : 403 }
      );
    }

    const tenant = resolution.tenant;
    const body = await req.json().catch(() => ({}));

    // 1. Pujar en subasta
    if (resource === 'subastas') {
      const parsed = auctionBidSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validación de puja fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const { auctionId, bidAmount, bidderName } = parsed.data;
      const result = fenixDb.placeAuctionBid(tenant.id, auctionId, bidAmount, bidderName);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, auction: result.auction });
    }

    // 2. Crear pedido en tienda (Persistente con cálculo exclusivo de precios en servidor)
    if (resource === 'orders') {
      const parsed = orderCreationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validación de pedido fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const { customerEmail, customerName, items, idempotencyKey } = parsed.data;

      try {
        let orderNumber = '';
        let totalAmount: number | string = 0;
        let currency = 'EUR';
        let status = 'PENDING';

        try {
          const created = await orderRepository.create(tenant.id, {
            customerEmail,
            customerName,
            items,
            idempotencyKey,
          });
          orderNumber = created.orderNumber;
          totalAmount = created.totalAmount.toString();
          currency = created.currency;
          status = created.status;
        } catch (dbErr: any) {
          if (dbErr instanceof DatabaseConnectionError) {
            const fallbackOrder = fenixDb.createOrder(tenant.id, {
              customerEmail,
              customerName,
              items,
            });
            orderNumber = fallbackOrder.orderNumber;
            totalAmount = fallbackOrder.totalAmount;
            currency = fallbackOrder.currency;
            status = fallbackOrder.status;
          } else {
            throw dbErr;
          }
        }

        return NextResponse.json({
          success: true,
          order: {
            orderNumber,
            totalAmount,
            currency,
            status,
          },
        });
      } catch (err: any) {
        if (err instanceof DatabaseConnectionError) throw err;
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // 3. Solicitud de Visita o Consulta Inmobiliaria (Persistencia real obligatoria)
    if (resource === 'inquiries' || resource === 'inmobiliaria-inquiry') {
      const parsed = propertyInquirySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validación de solicitud fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const { name, email, phone, message, propertyId } = parsed.data;

      try {
        let inquiryResult;
        if (propertyId) {
          inquiryResult = await propertyRepository.createInquiry(tenant.id, propertyId, {
            name,
            email,
            phone,
            message,
          });
        } else {
          inquiryResult = await contactRepository.createInquiry(tenant.id, {
            name,
            email,
            phone,
            subject: 'Consulta Inmobiliaria / Visita',
            message,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Solicitud de visita registrada con persistencia en el sistema.',
          inquiryId: inquiryResult.id,
        }, { status: 201 });
      } catch (err: any) {
        if (err instanceof DatabaseConnectionError) {
          // Si la base de datos no está disponible, informar indisponibilidad
          // NUNCA fingir que se guardó
          return NextResponse.json(
            { success: false, error: 'DATABASE_UNAVAILABLE', message: 'Servicio de persistencia de consultas no disponible.' },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // 4. Denuncias y Reportes de Contenido / Anuncios
    if (resource === 'reports') {
      const parsed = contentReportSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validación de reporte fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      try {
        const report = await contactRepository.createReport(tenant.id, parsed.data);
        return NextResponse.json({
          success: true,
          message: 'Denuncia registrada y remitida a la cola de moderación del tenant.',
          reportId: report.id,
        }, { status: 201 });
      } catch (err: any) {
        if (err instanceof DatabaseConnectionError) {
          return NextResponse.json(
            { success: false, error: 'DATABASE_UNAVAILABLE', message: 'Servicio de reportes no disponible.' },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { success: false, error: `Operación no admitida sobre recurso '${resource}'` },
      { status: 405 }
    );
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_UNAVAILABLE', message: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
