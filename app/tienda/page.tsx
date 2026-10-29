'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import StoreHeader from '../../components/tienda/StoreHeader';
import CartDrawer from '../../components/tienda/CartDrawer';
import TiendaEcommerceView from '../../components/tienda/TiendaEcommerceView';
import TiendaBlogView from '../../components/tienda/TiendaBlogView';
import TiendaInmobiliariaView from '../../components/tienda/TiendaInmobiliariaView';
import TiendaSubastasView from '../../components/tienda/TiendaSubastasView';
import TiendaClasificadosView from '../../components/tienda/TiendaClasificadosView';
import TiendaPersonalesView from '../../components/tienda/TiendaPersonalesView';

import { fenixDb } from '../../lib/db/client';
import {
  ProductDto,
  CartItemDto,
  FenixModuleType,
  BlogPostDto,
  RealEstatePropertyDto,
  AuctionItemDto,
  ClassifiedAdDto,
  PersonalAdDto,
} from '../../lib/types/fenix';
import { resolveTenantByHostname } from '../../lib/tenancy/resolver';
import { AlertCircle, ShieldAlert, Globe, ArrowRight, ShieldCheck, Megaphone } from 'lucide-react';

function StoreFrontContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Dominio solicitado: estrictamente normalizado y verificado
  const domainParam = searchParams.get('domain');
  const moduleParam = searchParams.get('modulo') as FenixModuleType | null;
  const itemParam = searchParams.get('item');

  const [activeHostname, setActiveHostname] = React.useState<string>(
    domainParam || 'modaurbana.fenixcms.app'
  );

  // Resolución estricta del tenant a partir del hostname
  const resolutionResult = React.useMemo(() => {
    return resolveTenantByHostname(activeHostname);
  }, [activeHostname]);

  const activeTenant = resolutionResult.success ? resolutionResult.tenant : null;

  // 2. Módulos autorizados por el plan del tenant
  const authorizedModules = React.useMemo<FenixModuleType[]>(() => {
    if (!activeTenant) return [];
    return fenixDb.getTenantModules(activeTenant.id);
  }, [activeTenant]);

  // Módulo seleccionado por el usuario o parámetro
  const [userSelectedModule, setUserSelectedModule] = React.useState<FenixModuleType | null>(null);

  // Módulo activo derivado
  const activeModule = React.useMemo<FenixModuleType>(() => {
    if (userSelectedModule && authorizedModules.includes(userSelectedModule)) {
      return userSelectedModule;
    }
    if (moduleParam && authorizedModules.includes(moduleParam)) {
      return moduleParam;
    }
    return authorizedModules[0] || 'ecommerce';
  }, [userSelectedModule, moduleParam, authorizedModules]);

  // Idiomas del tenant
  const languages = React.useMemo(() => {
    return activeTenant ? fenixDb.getLanguages(activeTenant.id) : [];
  }, [activeTenant]);
  const [currentLanguage, setCurrentLanguage] = React.useState('es');

  // Carrito de compras de la tienda
  const [cartItems, setCartItems] = React.useState<CartItemDto[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  // Sincronización al cambiar de tenant en render
  const [prevTenantId, setPrevTenantId] = React.useState<string | undefined>(activeTenant?.id);
  if (activeTenant?.id !== prevTenantId) {
    setPrevTenantId(activeTenant?.id);
    setCartItems([]);
    setUserSelectedModule(null);
  }

  // Recurso individual solicitado por URL verificado con estricto aislamiento de tenant
  const queryItemError = React.useMemo(() => {
    if (!activeTenant || !itemParam) return null;

    const foundProduct = fenixDb.getProductById(activeTenant.id, itemParam);
    const foundBlog = fenixDb.getBlogPostBySlug(activeTenant.id, itemParam);
    const foundProperty = fenixDb.getPropertyBySlug(activeTenant.id, itemParam);
    const foundAuction = fenixDb.getAuctionBySlug(activeTenant.id, itemParam);
    const foundClassified = fenixDb.getClassifiedBySlug(activeTenant.id, itemParam);
    const foundPersonal = fenixDb.getPersonalAdBySlug(activeTenant.id, itemParam);

    if (
      !foundProduct &&
      !foundBlog &&
      !foundProperty &&
      !foundAuction &&
      !foundClassified &&
      !foundPersonal
    ) {
      return `El recurso solicitado '${itemParam}' no existe o no pertenece al tenant '${activeTenant.name}'. Aislamiento de datos aplicado.`;
    }
    return null;
  }, [activeTenant, itemParam]);

  // Gestión del Carrito
  const handleAddToCart = (product: ProductDto) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckout = async (customer: {
    name: string;
    email: string;
    simulateVerifiedPayment: boolean;
  }) => {
    if (!activeTenant) throw new Error('No se pudo resolver el tenant');

    const verificationCode = customer.simulateVerifiedPayment
      ? `FENIX_PAY_${Date.now()}`
      : undefined;

    const order = fenixDb.createOrder(activeTenant.id, {
      customerName: customer.name,
      customerEmail: customer.email,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentVerificationId: verificationCode,
    });

    setCartItems([]);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
    };
  };

  // Live Auction Bid Handler
  const [auctionRefreshKey, setAuctionRefreshKey] = React.useState(0);
  const handlePlaceBid = (auctionId: string, amount: number, bidder: string) => {
    if (!activeTenant) return { success: false, error: 'Tenant no resuelto' };
    const res = fenixDb.placeAuctionBid(activeTenant.id, auctionId, amount, bidder);
    if (res.success) {
      setAuctionRefreshKey((k) => k + 1);
    }
    return res;
  };

  // Contenido cargado con estricto aislamiento por Tenant ID y publicación
  const products = React.useMemo(() => {
    return activeTenant ? fenixDb.getProducts(activeTenant.id) : [];
  }, [activeTenant]);

  const blogPosts = React.useMemo(() => {
    return activeTenant ? fenixDb.getBlogPosts(activeTenant.id) : [];
  }, [activeTenant]);

  const properties = React.useMemo(() => {
    return activeTenant ? fenixDb.getProperties(activeTenant.id) : [];
  }, [activeTenant]);

  const auctions = React.useMemo(() => {
    if (!activeTenant) return [];
    if (auctionRefreshKey < 0) return [];
    return fenixDb.getAuctions(activeTenant.id);
  }, [activeTenant, auctionRefreshKey]);

  const classifieds = React.useMemo(() => {
    return activeTenant ? fenixDb.getClassifiedAds(activeTenant.id) : [];
  }, [activeTenant]);

  const personals = React.useMemo(() => {
    return activeTenant ? fenixDb.getPersonalAds(activeTenant.id) : [];
  }, [activeTenant]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Comprobar si el módulo actual está autorizado por el plan
  const isCurrentModuleAuthorized = authorizedModules.includes(activeModule);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      <Navbar />

      {/* Selector de Simulación de Dominio / Hostname */}
      <aside
        aria-label="Selector de host y validación de dominio"
        className="bg-zinc-950 border-b border-zinc-800 px-4 py-2 text-xs"
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-zinc-400">
            <span className="font-semibold text-zinc-300">Resolución de Hostname:</span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setActiveHostname('modaurbana.fenixcms.app')}
                className={`rounded px-2.5 py-1 transition ${
                  activeHostname === 'modaurbana.fenixcms.app'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                modaurbana.fenixcms.app
              </button>
              <button
                type="button"
                onClick={() => setActiveHostname('techgadgets.fenixcms.app')}
                className={`rounded px-2.5 py-1 transition ${
                  activeHostname === 'techgadgets.fenixcms.app'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                techgadgets.fenixcms.app
              </button>
              <button
                type="button"
                onClick={() => setActiveHostname('tienda-pendiente.com')}
                className={`rounded px-2.5 py-1 transition ${
                  activeHostname === 'tienda-pendiente.com'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                [Probar Dominio No Verificado]
              </button>
              <button
                type="button"
                onClick={() => setActiveHostname('tienda-no-registrada.com')}
                className={`rounded px-2.5 py-1 transition ${
                  activeHostname === 'tienda-no-registrada.com'
                    ? 'bg-red-900 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                [Probar Host No Registrado]
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            {resolutionResult.success ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Tenant: <strong>{resolutionResult.tenant.name}</strong></span>
              </span>
            ) : (
              <span className="text-amber-400 font-bold">Estado: Resolución Rechazada</span>
            )}
          </div>
        </div>
      </aside>

      {/* CASO 1: ERROR CONTROLADO DE DOMINIO NO REGISTRADO O NO VERIFICADO */}
      {!resolutionResult.success || !activeTenant ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/40 border border-amber-800 text-amber-500 mb-6">
              <AlertCircle className="h-7 w-7" />
            </div>

            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
              Resolución Fallida de Tenant (Fase 2.9)
            </span>

            <h1 className="mt-3 text-2xl font-black text-white">
              Dominio No Asociado o No Verificado
            </h1>

            <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
              {!resolutionResult.success ? resolutionResult.message : 'Dominio no resuelto'}
            </p>

            <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left text-xs font-mono text-zinc-400 space-y-1.5">
              <div className="text-zinc-500 text-[10px]">DIRECTIVAS DE AISLAMIENTO FENIXCMS:</div>
              <div>&bull; Resolución estricta desde tabla de dominios verificados.</div>
              <div>&bull; Bloqueo total de cabeceras arbitrarias que intenten forzar otro tenant.</div>
              <div>&bull; Jamás se carga el catálogo de otro cliente como fallback.</div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveHostname('modaurbana.fenixcms.app')}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                Probar Tenant A (Moda)
              </button>
              <button
                type="button"
                onClick={() => setActiveHostname('techgadgets.fenixcms.app')}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
              >
                Probar Tenant B (Tech)
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Tenant Store Header con Navegación de Módulos Autorizados */}
          <StoreHeader
            tenantName={activeTenant.name}
            domainName={activeTenant.customDomain || `${activeTenant.slug}.fenixcms.app`}
            branding={activeTenant.branding}
            authorizedModules={authorizedModules}
            activeModule={activeModule}
            onSelectModule={(mod) => {
              setUserSelectedModule(mod);
            }}
            languages={languages}
            currentLanguage={currentLanguage}
            onLanguageChange={setCurrentLanguage}
            cartCount={cartCount}
            onOpenCart={() => setIsCartOpen(true)}
          />

          {/* Banner de Aviso de Tenant si existe */}
          {activeTenant.branding?.announcement && (
            <div
              className="py-2 px-4 text-center text-xs font-medium border-b border-zinc-800/80"
              style={{
                backgroundColor: `${activeTenant.branding.accentColor || '#dc2626'}15`,
                color: activeTenant.branding.accentColor || '#dc2626',
              }}
            >
              <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
                <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{activeTenant.branding.announcement}</span>
              </div>
            </div>
          )}

          {/* Alerta si el usuario intentó consultar un ítem de otro tenant */}
          {queryItemError && (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
              <div className="rounded-xl border border-red-900/80 bg-red-950/60 p-4 text-xs text-red-200 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white">Bloqueo de Acceso Cruzado entre Tenants</h3>
                  <p className="mt-1 text-red-300">{queryItemError}</p>
                </div>
              </div>
            </div>
          )}

          {/* CUERPO PRINCIPAL DEL MÓDULO */}
          <main className="flex-1 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* CASO 2: EL TENANT NO TIENE CONTRATADO EL MÓDULO SOLICITADO */}
              {!isCurrentModuleAuthorized ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400 max-w-xl mx-auto">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mb-4">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                    Acceso No Autorizado
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    Módulo No Contratado en este Espacio
                  </h2>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    El plan <strong>{activeTenant.planName}</strong> contratado por{' '}
                    <strong>{activeTenant.name}</strong> no incluye el módulo solicitado.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setUserSelectedModule(authorizedModules[0] || 'ecommerce')}
                      className="rounded-xl bg-zinc-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-700 transition"
                    >
                      Volver a {authorizedModules[0] || 'la tienda oficial'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* RENDERIZADO DEL MÓDULO AUTORIZADO ACTIVO */}
                  {activeModule === 'ecommerce' && (
                    <TiendaEcommerceView
                      tenantName={activeTenant.name}
                      products={products}
                      onAddToCart={handleAddToCart}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}

                  {activeModule === 'blog' && (
                    <TiendaBlogView
                      tenantName={activeTenant.name}
                      posts={blogPosts}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}

                  {activeModule === 'inmobiliaria' && (
                    <TiendaInmobiliariaView
                      tenantName={activeTenant.name}
                      properties={properties}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}

                  {activeModule === 'subastas' && (
                    <TiendaSubastasView
                      tenantName={activeTenant.name}
                      auctions={auctions}
                      onPlaceBid={handlePlaceBid}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}

                  {activeModule === 'clasificados' && (
                    <TiendaClasificadosView
                      tenantName={activeTenant.name}
                      classifieds={classifieds}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}

                  {activeModule === 'personales' && (
                    <TiendaPersonalesView
                      tenantName={activeTenant.name}
                      personals={personals}
                      accentColor={activeTenant.branding?.accentColor}
                    />
                  )}
                </>
              )}
            </div>
          </main>

          {/* Cart Drawer para la Tienda */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
          />
        </>
      )}

      <Footer />
    </div>
  );
}

export default function StoreFrontPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <StoreFrontContent />
    </Suspense>
  );
}
