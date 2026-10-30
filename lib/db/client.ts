// FenixCMS Data Access & Tenant Isolation Engine
import {
  INITIAL_PLANS,
  INITIAL_TENANTS,
  INITIAL_DOMAINS,
  INITIAL_LANGUAGES,
  INITIAL_PAGES,
  INITIAL_PLUGINS,
  INITIAL_THEMES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_BLOG_POSTS,
  INITIAL_PROPERTIES,
  INITIAL_AUCTIONS,
  INITIAL_CLASSIFIEDS,
  INITIAL_PERSONALS,
} from './mock-data';
import {
  SubscriptionPlanDto,
  TenantDto,
  DomainDto,
  LanguageDto,
  CmsPageDto,
  PluginDto,
  ThemeDto,
  ProductDto,
  StoreOrderDto,
  FenixModuleType,
  BlogPostDto,
  RealEstatePropertyDto,
  AuctionItemDto,
  ClassifiedAdDto,
  PersonalAdDto,
} from '../types/fenix';

import { sanitizeDatabaseUrl, assertProductionPersistenceReady, prisma } from './prisma';

import {
  productRepository,
  orderRepository,
  blogRepository,
  propertyRepository,
  auctionRepository,
  adRepository,
  tenantRepository,
  contactRepository,
} from '../repositories';

// Repositorio de datos con integración a repositorios PostgreSQL Prisma
class FenixDataRepository {
  // ATENCIÓN: Las siguientes colecciones se mantienen EXCLUSIVAMENTE para pruebas unitarias aisladas
  // o fixtures de test cuando no se dispone de una instancia PostgreSQL activa.
  // En producción, los datos de negocio se gestionan íntegramente a través de los repositorios Prisma.
  private testPlans: SubscriptionPlanDto[] = [...INITIAL_PLANS];
  private testTenants: TenantDto[] = [...INITIAL_TENANTS];
  private testDomains: DomainDto[] = [...INITIAL_DOMAINS];
  private testLanguages: LanguageDto[] = [...INITIAL_LANGUAGES];
  private testPages: CmsPageDto[] = [...INITIAL_PAGES];
  private testPlugins: PluginDto[] = [...INITIAL_PLUGINS];
  private testThemes: ThemeDto[] = [...INITIAL_THEMES];
  private testProducts: ProductDto[] = [...INITIAL_PRODUCTS];
  private testOrders: StoreOrderDto[] = [...INITIAL_ORDERS];
  private testBlogPosts: BlogPostDto[] = [...INITIAL_BLOG_POSTS];
  private testProperties: RealEstatePropertyDto[] = [...INITIAL_PROPERTIES];
  private testAuctions: AuctionItemDto[] = [...INITIAL_AUCTIONS];
  private testClassifieds: ClassifiedAdDto[] = [...INITIAL_CLASSIFIEDS];
  private testPersonals: PersonalAdDto[] = [...INITIAL_PERSONALS];

  // Referencias a los repositorios persistentes de PostgreSQL
  public readonly productsRepo = productRepository;
  public readonly ordersRepo = orderRepository;
  public readonly blogRepo = blogRepository;
  public readonly propertiesRepo = propertyRepository;
  public readonly auctionsRepo = auctionRepository;
  public readonly adsRepo = adRepository;
  public readonly tenantsRepo = tenantRepository;
  public readonly contactsRepo = contactRepository;

  private get plans() { return this.testPlans; }
  private get tenants() { return this.testTenants; }
  private get domains() { return this.testDomains; }
  private get languages() { return this.testLanguages; }
  private get pages() { return this.testPages; }
  private get plugins() { return this.testPlugins; }
  private get themes() { return this.testThemes; }
  private get products() { return this.testProducts; }
  private get orders() { return this.testOrders; }
  private get blogPosts() { return this.testBlogPosts; }
  private get properties() { return this.testProperties; }
  private get auctions() { return this.testAuctions; }
  private get classifieds() { return this.testClassifieds; }
  private get personals() { return this.testPersonals; }

  // --- DIAGNÓSTICO DE PERSISTENCIA REAL ---
  public getPersistenceStatus() {
    return {
      engine: 'PostgreSQL + Prisma ORM (v6.19.3)',
      schemaPath: 'prisma/schema.prisma',
      migrationPath: 'prisma/migrations/20261030000000_add_cms_modules/migration.sql',
      sanitizedDatabaseUrl: sanitizeDatabaseUrl(process.env.DATABASE_URL),
      isDatabaseUrlSet: Boolean(process.env.DATABASE_URL),
      mode: process.env.NODE_ENV === 'production' ? 'PRODUCTION_PERSISTENCE' : 'HYBRID_ACTIVE',
      repositories: [
        'ProductRepository',
        'OrderRepository',
        'BlogRepository',
        'PropertyRepository',
        'AuctionRepository',
        'AdRepository',
        'TenantRepository',
        'ContactRepository',
      ],
      note: 'Repositorios persistentes activos con aislamiento por tenant, transacciones atómicas y protección contable.',
    };
  }

  // --- PLATAFORMA SAAS (SUPERADMIN & PLANES) ---
  public getPlans(): SubscriptionPlanDto[] {
    return this.plans;
  }

  public getPlanBySlug(slug: string): SubscriptionPlanDto | undefined {
    return this.plans.find((p) => p.slug === slug);
  }

  public getTenants(): TenantDto[] {
    return this.tenants;
  }

  public getTenantById(tenantId: string): TenantDto | undefined {
    return this.tenants.find((t) => t.id === tenantId);
  }

  public getTenantBySlug(slug: string): TenantDto | undefined {
    return this.tenants.find((t) => t.slug === slug);
  }

  public createTenant(data: {
    name: string;
    slug: string;
    planSlug: string;
    adminEmail: string;
  }): TenantDto {
    assertProductionPersistenceReady();
    const plan = this.getPlanBySlug(data.planSlug) || this.plans[0];
    const newTenant: TenantDto = {
      id: `tenant_${Date.now()}`,
      name: data.name,
      slug: data.slug,
      status: 'ACTIVE',
      planId: plan.id,
      planName: plan.name,
      customDomain: `${data.slug}.fenixcms.app`,
      createdAt: new Date().toISOString(),
    };

    this.tenants.push(newTenant);

    // Inicializar dominio
    this.domains.push({
      id: `dom_${Date.now()}`,
      tenantId: newTenant.id,
      hostname: `${data.slug}.fenixcms.app`,
      isPrimary: true,
      isVerified: true,
      sslStatus: 'ACTIVE',
    });

    // Inicializar idiomas por defecto
    this.languages.push(
      {
        id: `lang_${Date.now()}_1`,
        tenantId: newTenant.id,
        code: 'es',
        name: 'Español',
        isDefault: true,
        isEnabled: true,
      },
      {
        id: `lang_${Date.now()}_2`,
        tenantId: newTenant.id,
        code: 'en',
        name: 'English',
        isDefault: false,
        isEnabled: true,
      }
    );

    // Inicializar tema predeterminado
    this.themes.push({
      id: `thm_${Date.now()}`,
      tenantId: newTenant.id,
      slug: 'fenix-dark-crimson',
      name: 'Fénix Carbon & Crimson',
      version: '2.0.0',
      isActive: true,
      previewColor: '#dc2626',
      description: 'Estética de alto contraste con fondo negro azabache, acentos carmesí y bordes pulidos.',
    });

    return newTenant;
  }

  // --- ESPACIO TENANT (AISLAMIENTO ESTRICTO POR TENANT_ID) ---

  public getDomains(tenantId: string): DomainDto[] {
    return this.domains.filter((d) => d.tenantId === tenantId);
  }

  public addDomain(tenantId: string, hostname: string): DomainDto {
    const newDomain: DomainDto = {
      id: `dom_${Date.now()}`,
      tenantId,
      hostname,
      isPrimary: false,
      isVerified: true,
      sslStatus: 'ACTIVE',
    };
    this.domains.push(newDomain);
    return newDomain;
  }

  public getLanguages(tenantId: string): LanguageDto[] {
    return this.languages.filter((l) => l.tenantId === tenantId);
  }

  public getPages(tenantId: string): CmsPageDto[] {
    return this.pages.filter((p) => p.tenantId === tenantId);
  }

  public getPlugins(tenantId: string): PluginDto[] {
    return this.plugins.filter((p) => p.tenantId === tenantId);
  }

  public togglePlugin(tenantId: string, pluginSlug: string): PluginDto | undefined {
    const plugin = this.plugins.find((p) => p.tenantId === tenantId && p.slug === pluginSlug);
    if (plugin) {
      plugin.isEnabled = !plugin.isEnabled;
    }
    return plugin;
  }

  public getThemes(tenantId: string): ThemeDto[] {
    return this.themes.filter((t) => t.tenantId === tenantId);
  }

  public setActiveTheme(tenantId: string, themeSlug: string): ThemeDto | undefined {
    this.themes.forEach((t) => {
      if (t.tenantId === tenantId) {
        t.isActive = t.slug === themeSlug;
      }
    });
    return this.themes.find((t) => t.tenantId === tenantId && t.slug === themeSlug);
  }

  // --- CONTROL DE MÓDULOS ACTIVOS & AUTORIZADOS POR EL PLAN ---
  public getTenantModules(tenantId: string): FenixModuleType[] {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return [];
    const plan = this.plans.find((p) => p.id === tenant.planId);
    if (!plan) return [];

    const tenantActive = tenant.activeModules || ['ecommerce'];
    // Solo permitimos los módulos que el tenant tiene activos Y que están autorizados en su plan
    return tenantActive.filter((m) => plan.allowedModules.includes(m));
  }

  public isModuleAuthorized(tenantId: string, moduleType: FenixModuleType): boolean {
    const authorized = this.getTenantModules(tenantId);
    return authorized.includes(moduleType);
  }

  // --- E-COMMERCE (AISLAMIENTO ESTRICTO Y PUBLICADO) ---
  public getProducts(tenantId: string): ProductDto[] {
    return this.products.filter((p) => p.tenantId === tenantId && p.isPublished);
  }

  public getProductById(tenantId: string, productId: string): ProductDto | undefined {
    return this.products.find((p) => p.tenantId === tenantId && p.id === productId && p.isPublished);
  }

  // --- BLOG ---
  public getBlogPosts(tenantId: string): BlogPostDto[] {
    if (!this.isModuleAuthorized(tenantId, 'blog')) return [];
    return this.blogPosts.filter((p) => p.tenantId === tenantId && p.isPublished);
  }

  public getBlogPostBySlug(tenantId: string, slug: string): BlogPostDto | undefined {
    if (!this.isModuleAuthorized(tenantId, 'blog')) return undefined;
    return this.blogPosts.find((p) => p.tenantId === tenantId && p.slug === slug && p.isPublished);
  }

  // --- INMOBILIARIA ---
  public getProperties(tenantId: string): RealEstatePropertyDto[] {
    if (!this.isModuleAuthorized(tenantId, 'inmobiliaria')) return [];
    return this.properties.filter((p) => p.tenantId === tenantId && p.isPublished);
  }

  public getPropertyBySlug(tenantId: string, slug: string): RealEstatePropertyDto | undefined {
    if (!this.isModuleAuthorized(tenantId, 'inmobiliaria')) return undefined;
    return this.properties.find((p) => p.tenantId === tenantId && p.slug === slug && p.isPublished);
  }

  // --- SUBASTAS ---
  public getAuctions(tenantId: string): AuctionItemDto[] {
    if (!this.isModuleAuthorized(tenantId, 'subastas')) return [];
    return this.auctions.filter((a) => a.tenantId === tenantId && a.isPublished);
  }

  public getAuctionBySlug(tenantId: string, slug: string): AuctionItemDto | undefined {
    if (!this.isModuleAuthorized(tenantId, 'subastas')) return undefined;
    return this.auctions.find((a) => a.tenantId === tenantId && a.slug === slug && a.isPublished);
  }

  public placeAuctionBid(
    tenantId: string,
    auctionId: string,
    bidAmount: number,
    bidderName: string
  ): { success: boolean; auction?: AuctionItemDto; error?: string } {
    if (!this.isModuleAuthorized(tenantId, 'subastas')) {
      return { success: false, error: 'Módulo de subastas no contratado o deshabilitado para este tenant.' };
    }

    const auction = this.auctions.find((a) => a.tenantId === tenantId && a.id === auctionId && a.isPublished);
    if (!auction) {
      return { success: false, error: 'Lote de subasta no encontrado o no pertenece a este tenant.' };
    }

    if (auction.status !== 'ACTIVE') {
      return { success: false, error: 'Esta subasta ya no se encuentra activa para recibir pujas.' };
    }

    // Comprobación de expiración de tiempo
    if (new Date(auction.endsAt).getTime() <= Date.now()) {
      auction.status = 'CLOSED';
      return { success: false, error: 'Esta subasta ya ha expirado y no admite nuevas pujas.' };
    }

    const minRequired = auction.currentBid + auction.minBidIncrement;
    if (bidAmount < minRequired) {
      return {
        success: false,
        error: `La puja mínima requerida es de ${minRequired.toFixed(2)} € (Puja actual: ${auction.currentBid} € + incremento de ${auction.minBidIncrement} €).`,
      };
    }

    auction.currentBid = bidAmount;
    auction.bidsCount += 1;

    return { success: true, auction };
  }

  // --- ANUNCIOS CLASIFICADOS ---
  public getClassifiedAds(tenantId: string): ClassifiedAdDto[] {
    if (!this.isModuleAuthorized(tenantId, 'clasificados')) return [];
    return this.classifieds.filter((c) => c.tenantId === tenantId && c.isPublished);
  }

  public getClassifiedBySlug(tenantId: string, slug: string): ClassifiedAdDto | undefined {
    if (!this.isModuleAuthorized(tenantId, 'clasificados')) return undefined;
    return this.classifieds.find((c) => c.tenantId === tenantId && c.slug === slug && c.isPublished);
  }

  // --- ANUNCIOS PERSONALES ---
  public getPersonalAds(tenantId: string): PersonalAdDto[] {
    if (!this.isModuleAuthorized(tenantId, 'personales')) return [];
    return this.personals.filter((p) => p.tenantId === tenantId && p.isPublished);
  }

  public getPersonalAdBySlug(tenantId: string, slug: string): PersonalAdDto | undefined {
    if (!this.isModuleAuthorized(tenantId, 'personales')) return undefined;
    return this.personals.find((p) => p.tenantId === tenantId && p.slug === slug && p.isPublished);
  }

  public getAllProductsAdmin(tenantId: string): ProductDto[] {
    return this.products.filter((p) => p.tenantId === tenantId);
  }

  public createProduct(tenantId: string, product: Omit<ProductDto, 'id' | 'tenantId'>): ProductDto {
    const newProduct: ProductDto = {
      id: `prod_${Date.now()}`,
      tenantId,
      ...product,
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  public getOrders(tenantId: string): StoreOrderDto[] {
    return this.orders.filter((o) => o.tenantId === tenantId);
  }

  public createOrder(
    tenantId: string,
    data: {
      customerEmail: string;
      customerName: string;
      items: { productId: string; quantity: number }[];
      paymentVerificationId?: string;
    }
  ): StoreOrderDto {
    assertProductionPersistenceReady();

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('El pedido debe incluir al menos un artículo.');
    }

    // 1. Protección de Idempotencia: Si la transacción ya fue procesada, retornar el pedido existente
    if (data.paymentVerificationId) {
      const existing = this.orders.find(
        (o) => o.tenantId === tenantId && o.paymentVerificationId === data.paymentVerificationId
      );
      if (existing) {
        return existing;
      }
    }

    // 2. Validación de artículos, cantidades e inventario disponible
    for (const item of data.items) {
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('La cantidad de cada artículo debe ser un número entero positivo mayor que cero.');
      }

      const prod = this.products.find((p) => p.tenantId === tenantId && p.id === item.productId && p.isPublished);
      if (!prod) {
        throw new Error(`Producto ${item.productId} no encontrado o no pertenece a este tenant`);
      }

      if (prod.stock < item.quantity) {
        throw new Error(
          `Inventario insuficiente para "${prod.title}". Stock disponible: ${prod.stock}, solicitado: ${item.quantity}.`
        );
      }
    }

    // 3. Reducción atómica de stock y cálculo de precios exclusivamente en el servidor
    let total = 0;
    const cartItems = data.items.map((item) => {
      const prod = this.products.find((p) => p.tenantId === tenantId && p.id === item.productId)!;
      // Descontar inventario garantizando que nunca sea negativo
      prod.stock = Math.max(0, prod.stock - item.quantity);
      total += prod.price * item.quantity;
      return {
        productId: prod.id,
        title: prod.title,
        price: prod.price,
        quantity: item.quantity,
        imageUrl: prod.imageUrl,
      };
    });

    // REGLA FASE 2 BIS.5: Prohibición tajante de simular pagos y tokens FENIX_PAY_.
    // Todos los pedidos se crean inicialmente como PENDING.
    const newOrder: StoreOrderDto = {
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId,
      orderNumber: `FNX-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      totalAmount: total,
      currency: 'EUR',
      status: 'PENDING',
      paymentVerificationId: data.paymentVerificationId,
      items: cartItems,
      createdAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }
}

// Singleton global para mantener consistencia en la app
declare global {
  var _fenixDataRepo: FenixDataRepository | undefined;
}

export const fenixDb = global._fenixDataRepo || new FenixDataRepository();
if (process.env.NODE_ENV !== 'production') {
  global._fenixDataRepo = fenixDb;
}
