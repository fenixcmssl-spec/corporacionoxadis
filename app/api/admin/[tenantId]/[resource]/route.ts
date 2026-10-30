// ============================================================================
// FENIXCMS SAAS — ENDPOINTS DE ADMINISTRACIÓN DE RECURSOS DEL TENANT
// FASE 2 BIS.6: PERSISTENCIA COMPLETA, CONTROL DE PROPIEDAD Y AISLAMIENTO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getSecurityContextFromRequest,
  getSecurityContextFromRequestAsync,
  enforceTenantOwnership,
  AuthenticationRequiredError,
  ForbiddenAccessError,
  TenantIsolationViolationError,
} from '../../../../../lib/security/authorization';
import { DatabaseConnectionError } from '../../../../../lib/db/prisma';
import { tenantIsolatedService } from '../../../../../lib/services/tenant-isolated.service';
import { storageService } from '../../../../../lib/services/storage.service';
import {
  createProductSchema,
  addDomainSchema,
  createBlogPostSchema,
  createPropertySchema,
  createClassifiedSchema,
  createPersonalSchema,
  moderationSchema,
} from '../../../../../lib/validations';
import {
  blogRepository,
  propertyRepository,
  adRepository,
  contactRepository,
} from '../../../../../lib/repositories';
import { fenixDb } from '../../../../../lib/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = (await getSecurityContextFromRequestAsync(req)) || getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida para acceder a los recursos del tenant.' }, { status: 401 });
    }

    enforceTenantOwnership(context, tenantId);

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;

    if (resource === 'info' || resource === 'tenant') {
      const tenant = tenantIsolatedService.getTenantInfo(context, tenantId);
      return NextResponse.json({ success: true, tenantId, tenant });
    }

    if (resource === 'products') {
      const products = tenantIsolatedService.getProducts(context, tenantId);
      return NextResponse.json({ success: true, tenantId, products });
    }

    if (resource === 'orders') {
      const orders = tenantIsolatedService.getOrders(context, tenantId);
      return NextResponse.json({ success: true, tenantId, orders });
    }

    if (resource === 'domains') {
      const domains = tenantIsolatedService.getDomains(context, tenantId);
      return NextResponse.json({ success: true, tenantId, domains });
    }

    if (resource === 'pages') {
      const pages = tenantIsolatedService.getPages(context, tenantId);
      return NextResponse.json({ success: true, tenantId, pages });
    }

    if (resource === 'plugins') {
      const plugins = tenantIsolatedService.getPlugins(context, tenantId);
      return NextResponse.json({ success: true, tenantId, plugins });
    }

    if (resource === 'themes') {
      const themes = tenantIsolatedService.getThemes(context, tenantId);
      return NextResponse.json({ success: true, tenantId, themes });
    }

    if (resource === 'languages') {
      const languages = tenantIsolatedService.getLanguages(context, tenantId);
      return NextResponse.json({ success: true, tenantId, languages });
    }

    // 1. BLOG
    if (resource === 'blog') {
      try {
        const result = await blogRepository.list({ tenantId, page, pageSize });
        return NextResponse.json({ success: true, tenantId, ...result });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const posts = fenixDb.getBlogPosts(tenantId);
          return NextResponse.json({ success: true, tenantId, items: posts, count: posts.length });
        }
        throw err;
      }
    }

    // 2. INMOBILIARIA
    if (resource === 'inmobiliaria') {
      try {
        const result = await propertyRepository.list({ tenantId, page, pageSize });
        return NextResponse.json({ success: true, tenantId, ...result });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const properties = fenixDb.getProperties(tenantId);
          return NextResponse.json({ success: true, tenantId, items: properties, count: properties.length });
        }
        throw err;
      }
    }

    // 3. ANUNCIOS CLASIFICADOS
    if (resource === 'clasificados') {
      try {
        const result = await adRepository.listClassifieds({ tenantId, page, pageSize });
        return NextResponse.json({ success: true, tenantId, ...result });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const classifieds = fenixDb.getClassifiedAds(tenantId);
          return NextResponse.json({ success: true, tenantId, items: classifieds, count: classifieds.length });
        }
        throw err;
      }
    }

    // 4. ANUNCIOS PERSONALES (Panel administrativo con acceso completo para moderación)
    if (resource === 'personales') {
      try {
        const result = await adRepository.listPersonals({ tenantId, page, pageSize, includePrivate: true });
        return NextResponse.json({ success: true, tenantId, ...result });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          const personals = fenixDb.getPersonalAds(tenantId);
          return NextResponse.json({ success: true, tenantId, items: personals, count: personals.length });
        }
        throw err;
      }
    }

    // 5. SOLICITUDES DE CONTACTO / VISITA
    if (resource === 'inquiries') {
      try {
        const items = await contactRepository.listInquiries(tenantId);
        return NextResponse.json({ success: true, tenantId, items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          return NextResponse.json({ success: true, tenantId, items: [] });
        }
        throw err;
      }
    }

    // 6. REPORTES DE CONTENIDO Y MODERACIÓN
    if (resource === 'reports') {
      try {
        const items = await contactRepository.listReports(tenantId);
        return NextResponse.json({ success: true, tenantId, items });
      } catch (err) {
        if (err instanceof DatabaseConnectionError) {
          return NextResponse.json({ success: true, tenantId, items: [] });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ error: error.message, code: 'DATABASE_UNAVAILABLE' }, { status: 503 });
    }
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Error interno en la solicitud' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = (await getSecurityContextFromRequestAsync(req)) || getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida para realizar modificaciones.' }, { status: 401 });
    }

    enforceTenantOwnership(context, tenantId);

    const body = await req.json().catch(() => ({}));

    // PRODUCTOS
    if (resource === 'products') {
      const parsed = createProductSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const product = tenantIsolatedService.createProduct(context, tenantId, {
        title: parsed.data.title,
        sku: parsed.data.sku,
        price: parsed.data.price,
        stock: parsed.data.stock,
        categoryId: 'cat_custom',
        categoryName: parsed.data.categoryName || 'Catálogo General',
        description: parsed.data.description || 'Producto registrado vía API segura.',
        imageUrl: `https://picsum.photos/seed/${parsed.data.sku}/600/600`,
        isPublished: true,
      });

      return NextResponse.json({ success: true, product }, { status: 201 });
    }

    // DOMINIOS
    if (resource === 'domains') {
      const parsed = addDomainSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const domain = tenantIsolatedService.addDomain(context, tenantId, parsed.data.hostname);
      return NextResponse.json({ success: true, domain }, { status: 201 });
    }

    // PLUGINS
    if (resource === 'plugins') {
      if (!body.slug || typeof body.slug !== 'string') {
        return NextResponse.json({ error: 'Slug de plugin no válido' }, { status: 400 });
      }
      const plugin = tenantIsolatedService.togglePlugin(context, tenantId, body.slug);
      return NextResponse.json({ success: true, plugin });
    }

    // TEMAS
    if (resource === 'themes') {
      if (!body.slug || typeof body.slug !== 'string') {
        return NextResponse.json({ error: 'Slug de tema no válido' }, { status: 400 });
      }
      const theme = tenantIsolatedService.setActiveTheme(context, tenantId, body.slug);
      return NextResponse.json({ success: true, theme });
    }

    // 1. BLOG (Creación con sanitización XSS)
    if (resource === 'blog') {
      const parsed = createBlogPostSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const post = await blogRepository.create(tenantId, parsed.data);
      return NextResponse.json({ success: true, post }, { status: 201 });
    }

    // 2. INMOBILIARIA
    if (resource === 'inmobiliaria') {
      const parsed = createPropertySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const property = await propertyRepository.create(tenantId, parsed.data);
      return NextResponse.json({ success: true, property }, { status: 201 });
    }

    // 3. ANUNCIOS CLASIFICADOS
    if (resource === 'clasificados') {
      const parsed = createClassifiedSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const classified = await adRepository.createClassified(tenantId, parsed.data);
      return NextResponse.json({ success: true, classified }, { status: 201 });
    }

    // 4. ANUNCIOS PERSONALES
    if (resource === 'personales') {
      const parsed = createPersonalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validación fallida', details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const personal = await adRepository.createPersonal(tenantId, parsed.data);
      return NextResponse.json({ success: true, personal }, { status: 201 });
    }

    // 5. ARCHIVOS Y MULTIMEDIA (Validación estricta y sin simulaciones)
    if (resource === 'upload') {
      const { filename, mimeType, sizeBytes } = body;
      const uploadResult = await storageService.uploadMedia({
        tenantId,
        filename,
        mimeType,
        sizeBytes,
        userId: context.userId,
        userRole: context.role,
      });

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: uploadResult.code, message: uploadResult.error },
          { status: uploadResult.code === 'STORAGE_UNCONFIGURED' ? 503 : 400 }
        );
      }

      return NextResponse.json({ success: true, file: uploadResult }, { status: 201 });
    }

    return NextResponse.json({ error: 'Recurso no admitido para creación' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ error: error.message, code: 'DATABASE_UNAVAILABLE' }, { status: 503 });
    }
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Error interno en la solicitud' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = (await getSecurityContextFromRequestAsync(req)) || getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida para realizar modificaciones.' }, { status: 401 });
    }

    enforceTenantOwnership(context, tenantId);

    const body = await req.json().catch(() => ({}));
    const id = body.id || req.nextUrl.searchParams.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'El parámetro identificador id es obligatorio para actualización.' }, { status: 400 });
    }

    // 1. BLOG
    if (resource === 'blog') {
      const updated = await blogRepository.update(tenantId, id, body);
      return NextResponse.json({ success: true, post: updated });
    }

    // 2. INMOBILIARIA
    if (resource === 'inmobiliaria') {
      const updated = await propertyRepository.update(tenantId, id, body);
      return NextResponse.json({ success: true, property: updated });
    }

    // 3. ANUNCIOS CLASIFICADOS
    if (resource === 'clasificados') {
      if (body.action === 'moderate') {
        const mod = moderationSchema.safeParse(body);
        if (!mod.success) {
          return NextResponse.json({ error: 'Datos de moderación no válidos' }, { status: 400 });
        }
        const updated = await adRepository.moderateClassified(tenantId, id, mod.data.status as any, mod.data.notes);
        return NextResponse.json({ success: true, classified: updated });
      }

      if (body.action === 'withdraw') {
        const updated = await adRepository.withdrawClassified(tenantId, id);
        return NextResponse.json({ success: true, classified: updated });
      }

      const updated = await adRepository.updateClassified(tenantId, id, body);
      return NextResponse.json({ success: true, classified: updated });
    }

    // 4. ANUNCIOS PERSONALES
    if (resource === 'personales') {
      if (body.action === 'moderate') {
        const mod = moderationSchema.safeParse(body);
        if (!mod.success) {
          return NextResponse.json({ error: 'Datos de moderación no válidos' }, { status: 400 });
        }
        const updated = await adRepository.moderatePersonal(tenantId, id, mod.data.status as any, mod.data.notes);
        return NextResponse.json({ success: true, personal: updated });
      }

      if (body.action === 'withdraw') {
        const updated = await adRepository.withdrawPersonal(tenantId, id);
        return NextResponse.json({ success: true, personal: updated });
      }

      const updated = await adRepository.updatePersonal(tenantId, id, body, true);
      return NextResponse.json({ success: true, personal: updated });
    }

    // 5. SOLICITUDES DE CONTACTO
    if (resource === 'inquiries') {
      const updated = await contactRepository.updateInquiryStatus(tenantId, id, body.status, body.replyNotes);
      return NextResponse.json({ success: true, inquiry: updated });
    }

    // 6. REPORTES DE CONTENIDO
    if (resource === 'reports') {
      const updated = await contactRepository.updateReportStatus(tenantId, id, body.status, body.reviewNotes);
      return NextResponse.json({ success: true, report: updated });
    }

    return NextResponse.json({ error: `Recurso '${resource}' no admitido para actualización.` }, { status: 404 });
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ error: error.message, code: 'DATABASE_UNAVAILABLE' }, { status: 503 });
    }
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes('no encontrado o no pertenece a este tenant')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Error interno en la solicitud' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = (await getSecurityContextFromRequestAsync(req)) || getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida para eliminar recursos.' }, { status: 401 });
    }

    enforceTenantOwnership(context, tenantId);

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Identificador id requerido en la query string (?id=...)' }, { status: 400 });
    }

    if (resource === 'blog') {
      await blogRepository.delete(tenantId, id);
      return NextResponse.json({ success: true, message: `Artículo '${id}' eliminado correctamente.` });
    }

    if (resource === 'inmobiliaria') {
      await propertyRepository.delete(tenantId, id);
      return NextResponse.json({ success: true, message: `Inmueble '${id}' eliminado correctamente.` });
    }

    if (resource === 'clasificados') {
      await adRepository.deleteClassified(tenantId, id);
      return NextResponse.json({ success: true, message: `Anuncio clasificado '${id}' eliminado correctamente.` });
    }

    if (resource === 'personales') {
      await adRepository.deletePersonal(tenantId, id);
      return NextResponse.json({ success: true, message: `Anuncio personal '${id}' eliminado correctamente.` });
    }

    return NextResponse.json({ error: `Recurso '${resource}' no admite eliminación directa.` }, { status: 404 });
  } catch (error: any) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ error: error.message, code: 'DATABASE_UNAVAILABLE' }, { status: 503 });
    }
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes('no encontrado o no pertenece a este tenant')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Error interno en la solicitud' }, { status: 500 });
  }
}
