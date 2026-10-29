import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantByHostname } from '../../../../../lib/tenancy/resolver';
import { fenixDb } from '../../../../../lib/db/client';
import { FenixModuleType } from '../../../../../lib/types/fenix';
import { orderCreationSchema, auctionBidSchema } from '../../../../../lib/security/validators';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string; resource: string }> }
) {
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
        customDomain: tenant.customDomain,
        planName: tenant.planName,
        branding: tenant.branding,
      },
      authorizedModules: modules,
      resolvedDomain: resolution.domain?.hostname,
    });
  }

  // 3. E-COMMERCE / TIENDA
  if (resource === 'products') {
    if (itemId) {
      const product = fenixDb.getProductById(tenant.id, itemId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Producto no encontrado o no pertenece a este tenant.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, product });
    }

    const products = fenixDb.getProducts(tenant.id);
    return NextResponse.json({ success: true, count: products.length, products });
  }

  // 4. BLOG
  if (resource === 'blog') {
    if (!fenixDb.isModuleAuthorized(tenant.id, 'blog')) {
      return NextResponse.json(
        { success: false, error: 'El módulo de Blog no está contratado ni autorizado para este tenant.' },
        { status: 403 }
      );
    }

    if (itemSlug) {
      const post = fenixDb.getBlogPostBySlug(tenant.id, itemSlug);
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Artículo no encontrado o no pertenece a este tenant.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, post });
    }

    const posts = fenixDb.getBlogPosts(tenant.id);
    return NextResponse.json({ success: true, count: posts.length, posts });
  }

  // 5. INMOBILIARIA
  if (resource === 'inmobiliaria') {
    if (!fenixDb.isModuleAuthorized(tenant.id, 'inmobiliaria')) {
      return NextResponse.json(
        { success: false, error: 'El módulo Inmobiliario no está contratado ni autorizado para este tenant.' },
        { status: 403 }
      );
    }

    if (itemSlug) {
      const property = fenixDb.getPropertyBySlug(tenant.id, itemSlug);
      if (!property) {
        return NextResponse.json(
          { success: false, error: 'Propiedad no encontrada o no pertenece a este tenant.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, property });
    }

    const properties = fenixDb.getProperties(tenant.id);
    return NextResponse.json({ success: true, count: properties.length, properties });
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
      const classified = fenixDb.getClassifiedBySlug(tenant.id, itemSlug);
      if (!classified) {
        return NextResponse.json(
          { success: false, error: 'Anuncio clasificado no encontrado o no pertenece a este tenant.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, classified });
    }

    const classifieds = fenixDb.getClassifiedAds(tenant.id);
    return NextResponse.json({ success: true, count: classifieds.length, classifieds });
  }

  // 8. ANUNCIOS PERSONALES
  if (resource === 'personales') {
    if (!fenixDb.isModuleAuthorized(tenant.id, 'personales')) {
      return NextResponse.json(
        { success: false, error: 'El módulo de Anuncios Personales no está contratado ni autorizado para este tenant.' },
        { status: 403 }
      );
    }

    if (itemSlug) {
      const personal = fenixDb.getPersonalAdBySlug(tenant.id, itemSlug);
      if (!personal) {
        return NextResponse.json(
          { success: false, error: 'Anuncio personal no encontrado o no pertenece a este tenant.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, personal });
    }

    const personals = fenixDb.getPersonalAds(tenant.id);
    return NextResponse.json({ success: true, count: personals.length, personals });
  }

  return NextResponse.json(
    { success: false, error: `Recurso '${resource}' desconocido o no implementado.` },
    { status: 404 }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string; resource: string }> }
) {
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

  // Pujar en subasta
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

  // Crear pedido en tienda
  if (resource === 'orders') {
    const parsed = orderCreationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validación de pedido fallida', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    const { customerEmail, customerName, items, paymentVerificationId } = parsed.data;
    const simulateVerified = Boolean(body.simulateVerifiedPayment);
    const verificationCode = paymentVerificationId || (simulateVerified ? `FENIX_PAY_${Date.now()}` : undefined);

    try {
      const order = fenixDb.createOrder(tenant.id, {
        customerEmail,
        customerName,
        items,
        paymentVerificationId: verificationCode,
      });

      return NextResponse.json({
        success: true,
        order: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          currency: order.currency,
          status: order.status,
          verificationCode: order.paymentVerificationId,
        },
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { success: false, error: `Operación no admitida sobre recurso '${resource}'` },
    { status: 405 }
  );
}

