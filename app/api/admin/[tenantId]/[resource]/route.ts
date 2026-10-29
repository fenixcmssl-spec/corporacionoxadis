import { NextRequest, NextResponse } from 'next/server';
import {
  getSecurityContextFromRequest,
  enforceTenantOwnership,
  AuthenticationRequiredError,
  ForbiddenAccessError,
  TenantIsolationViolationError,
} from '../../../../../lib/security/authorization';
import { tenantIsolatedService } from '../../../../../lib/services/tenant-isolated.service';
import { createProductSchema, addDomainSchema } from '../../../../../lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
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

    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno en la solicitud' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; resource: string }> }
) {
  const { tenantId, resource } = await params;

  try {
    const context = getSecurityContextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

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

    return NextResponse.json({ error: 'Recurso no admitido para creación' }, { status: 404 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof TenantIsolationViolationError || error instanceof ForbiddenAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno en la solicitud' }, { status: 500 });
  }
}
