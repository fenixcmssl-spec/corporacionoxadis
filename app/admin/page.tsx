'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import TenantSidebar from '../../components/admin/TenantSidebar';
import {
  FileText,
  ShoppingBag,
  Store,
  Puzzle,
  Palette,
  Globe2,
  Languages,
  Plus,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { TenantDto, ProductDto, StoreOrderDto, DomainDto, CmsPageDto } from '../../lib/types/fenix';
import { formatDate } from '../../lib/utils/format';

interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  userType: 'SUPERADMIN' | 'TENANT_USER';
  tenantId?: string;
  role?: string;
}

function TenantAdminContent() {
  const searchParams = useSearchParams();

  // Estado de autenticación y sesión validada en servidor
  const [sessionUser, setSessionUser] = React.useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [httpStatus, setHttpStatus] = React.useState<number | null>(null);

  // Espacio de tenant activo
  const [activeTenant, setActiveTenant] = React.useState<TenantDto | null>(null);
  const [tenants, setTenants] = React.useState<TenantDto[]>([]);
  const [activeSection, setActiveSection] = React.useState('overview');

  // Datos aislados del tenant cargados exclusivamente vía API
  const [products, setProducts] = React.useState<ProductDto[]>([]);
  const [orders, setOrders] = React.useState<StoreOrderDto[]>([]);
  const [plugins, setPlugins] = React.useState<any[]>([]);
  const [themes, setThemes] = React.useState<any[]>([]);
  const [domains, setDomains] = React.useState<DomainDto[]>([]);
  const [languages, setLanguages] = React.useState<any[]>([]);
  const [pages, setPages] = React.useState<CmsPageDto[]>([]);

  // Estados de formularios y acciones
  const [showAddProduct, setShowAddProduct] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newSku, setNewSku] = React.useState('');
  const [newPrice, setNewPrice] = React.useState('');
  const [newStock, setNewStock] = React.useState('10');
  const [newCategory, setNewCategory] = React.useState('Catálogo General');

  const [newDomainHost, setNewDomainHost] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Carga paralela de recursos mediante APIs del servidor
  const loadTenantData = React.useCallback(async (tenantId: string) => {
    try {
      // Metadatos del tenant
      const infoRes = await fetch(`/api/admin/${tenantId}/info`);
      if (!infoRes.ok) {
        setHttpStatus(infoRes.status);
        if (infoRes.status === 403) {
          setAuthError('Aislamiento de Tenant Violado: Acceso no autorizado a datos de otra organización.');
        } else if (infoRes.status === 401) {
          setAuthError('Sesión requerida.');
        } else if (infoRes.status === 503) {
          setAuthError('Servicio de base de datos no disponible temporalmente.');
        } else {
          setAuthError('Espacio de organización no disponible o no encontrado.');
        }
        return;
      }

      const infoData = await infoRes.json();
      const currentTenant = infoData.tenant;
      setActiveTenant(currentTenant);
      setTenants([currentTenant]);

      // Consultas paralelas a recursos aislados
      const [pRes, oRes, dRes, pgRes, plRes, thRes, lRes] = await Promise.all([
        fetch(`/api/admin/${tenantId}/products`),
        fetch(`/api/admin/${tenantId}/orders`),
        fetch(`/api/admin/${tenantId}/domains`),
        fetch(`/api/admin/${tenantId}/pages`),
        fetch(`/api/admin/${tenantId}/plugins`),
        fetch(`/api/admin/${tenantId}/themes`),
        fetch(`/api/admin/${tenantId}/languages`),
      ]);

      if (pRes.ok) {
        const pd = await pRes.json();
        setProducts(pd.products || []);
      }
      if (oRes.ok) {
        const od = await oRes.json();
        setOrders(od.orders || []);
      }
      if (dRes.ok) {
        const dd = await dRes.json();
        setDomains(dd.domains || []);
      }
      if (pgRes.ok) {
        const pgd = await pgRes.json();
        setPages(pgd.pages || []);
      }
      if (plRes.ok) {
        const pld = await plRes.json();
        setPlugins(pld.plugins || []);
      }
      if (thRes.ok) {
        const thd = await thRes.json();
        setThemes(thd.themes || []);
      }
      if (lRes.ok) {
        const ld = await lRes.json();
        setLanguages(ld.languages || []);
      }
    } catch {
      setActionError('Error de red al sincronizar los recursos del tenant.');
    }
  }, []);

  // Carga de sesión y resolución de tenant basada en servidor
  React.useEffect(() => {
    let isMounted = true;

    async function initializeAdminSession() {
      setAuthLoading(true);
      setAuthError(null);
      setHttpStatus(null);

      try {
        // 1. Validar sesión persistente contra el endpoint seguro /api/auth/me
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          if (isMounted) {
            setHttpStatus(authRes.status);
            setAuthError('Autenticación requerida para acceder al panel de administración.');
            setAuthLoading(false);
          }
          return;
        }

        const authData = await authRes.json();
        if (!authData.authenticated || !authData.user) {
          if (isMounted) {
            setHttpStatus(401);
            setAuthError('Sesión no encontrada o credenciales expiradas.');
            setAuthLoading(false);
          }
          return;
        }

        const user: SessionUser = authData.user;
        if (isMounted) setSessionUser(user);

        // 2. Determinar el tenant legítimo:
        // En FenixCMS SaaS, un usuario ordinario no puede saltar a otro tenant cambiando ?tenant=
        let targetTenantId: string | undefined = user.tenantId;

        // Solo el SuperAdmin en modo soporte puede elegir tenant explícito mediante query param
        if (user.userType === 'SUPERADMIN') {
          targetTenantId = searchParams.get('tenant') || user.tenantId || 'tenant_moda_01';
        }

        if (!targetTenantId) {
          if (isMounted) {
            setHttpStatus(403);
            setAuthError('La cuenta autenticada no tiene una organización asignada.');
            setAuthLoading(false);
          }
          return;
        }

        // 3. Cargar datos del tenant a través de las APIs protegidas
        if (isMounted) {
          await loadTenantData(targetTenantId);
        }
      } catch {
        if (isMounted) {
          setHttpStatus(500);
          setAuthError('Error de conexión con el servidor de autenticación.');
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    initializeAdminSession();

    return () => {
      isMounted = false;
    };
  }, [searchParams, loadTenantData]);

  // Cambio de tenant (solo permitido en modo soporte auditado de SuperAdmin)
  const handleTenantChange = (tenant: TenantDto) => {
    if (sessionUser?.userType !== 'SUPERADMIN') return;
    setActiveTenant(tenant);
    loadTenantData(tenant.id);
  };

  // Conmutar plugin vía API protegida
  const handleTogglePlugin = async (slug: string) => {
    if (!activeTenant) return;
    try {
      const res = await fetch(`/api/admin/${activeTenant.id}/plugins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        const plRes = await fetch(`/api/admin/${activeTenant.id}/plugins`);
        if (plRes.ok) {
          const d = await plRes.json();
          setPlugins(d.plugins || []);
        }
      }
    } catch {
      setActionError('Error al conmutar estado del plugin.');
    }
  };

  // Activar tema visual vía API protegida
  const handleActivateTheme = async (slug: string) => {
    if (!activeTenant) return;
    try {
      const res = await fetch(`/api/admin/${activeTenant.id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        const thRes = await fetch(`/api/admin/${activeTenant.id}/themes`);
        if (thRes.ok) {
          const d = await thRes.json();
          setThemes(d.themes || []);
        }
      }
    } catch {
      setActionError('Error al activar tema.');
    }
  };

  // Crear producto vía POST a API protegida
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !newTitle.trim() || !newSku.trim() || !newPrice) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/${activeTenant.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          sku: newSku.trim(),
          price: parseFloat(newPrice),
          stock: parseInt(newStock, 10) || 0,
          categoryName: newCategory,
          description: 'Producto registrado desde el panel de administración FenixCMS.',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Error al guardar el producto.');
        return;
      }

      setActionSuccess(`Producto '${newTitle}' creado y registrado con éxito.`);
      setShowAddProduct(false);
      setNewTitle('');
      setNewSku('');
      setNewPrice('');
      setNewStock('10');

      // Refrescar catálogo a través de la API
      const pRes = await fetch(`/api/admin/${activeTenant.id}/products`);
      if (pRes.ok) {
        const pd = await pRes.json();
        setProducts(pd.products || []);
      }
    } catch {
      setActionError('Error al enviar la petición de creación de producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vincular dominio vía POST a API protegida
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !newDomainHost.trim()) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/${activeTenant.id}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newDomainHost.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Error al vincular el dominio.');
        return;
      }

      setActionSuccess(`Dominio '${newDomainHost.trim()}' vinculado con éxito para verificación DNS.`);
      setNewDomainHost('');

      // Refrescar dominios a través de la API
      const dRes = await fetch(`/api/admin/${activeTenant.id}/domains`);
      if (dRes.ok) {
        const dd = await dRes.json();
        setDomains(dd.domains || []);
      }
    } catch {
      setActionError('Error al vincular dominio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vista de carga inicial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            <p className="text-xs font-mono text-zinc-400">Verificando sesión persistente y permisos de tenant...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Vista de error de acceso (401, 403, 503 o tenant no autorizado)
  if (!activeTenant || authError) {
    const is401 = httpStatus === 401;
    const is403 = httpStatus === 403;
    const is503 = httpStatus === 503;

    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border mb-6 ${
              is401 ? 'bg-amber-950/40 border-amber-800 text-amber-500' : 'bg-red-950/40 border-red-800 text-red-500'
            }`}>
              <AlertCircle className="h-7 w-7" />
            </div>

            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
              is401
                ? 'text-amber-400 bg-amber-950/80 border-amber-800'
                : 'text-red-400 bg-red-950/80 border-red-800'
            }`}>
              {is401 ? 'HTTP 401 &bull; Autenticación Requerida' : is403 ? 'HTTP 403 &bull; Aislamiento de Tenant' : is503 ? 'HTTP 503 &bull; Persistencia Offline' : 'Acceso Restringido'}
            </span>

            <h1 className="mt-3 text-2xl font-black text-white">
              {is401 ? 'Inicia Sesión en tu Organización' : is403 ? 'Acceso No Autorizado' : 'Espacio no disponible'}
            </h1>

            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              {authError || 'El espacio solicitado requiere credenciales de organización validadas en el servidor.'}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              {is401 ? (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition"
                >
                  Ir al Acceso de Cliente
                </Link>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-800 px-5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Volver al Inicio
                </Link>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar Navigation */}
        <TenantSidebar
          tenants={tenants}
          activeTenant={activeTenant}
          onSelectTenant={handleTenantChange}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isSuperAdmin={sessionUser?.userType === 'SUPERADMIN'}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-6xl">
          {/* Action notification banners */}
          {actionSuccess && (
            <div className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">&times;</button>
            </div>
          )}
          {actionError && (
            <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-xs font-semibold text-red-300 flex items-center justify-between">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)} className="text-red-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h1 className="text-2xl font-black text-white">{activeTenant.name}</h1>
                <span className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 font-mono">
                  {activeTenant.slug}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Dominio: <span className="text-red-400">{activeTenant.customDomain}</span> | Licencia:{' '}
                <span className="text-zinc-200">{activeTenant.planName}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/tienda"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition"
              >
                <span>Ver Tienda Pública</span>
                <ExternalLink className="h-3.5 w-3.5 text-red-500" />
              </Link>
            </div>
          </div>

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <div className="space-y-8">
              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    Productos Activos <ShoppingBag className="h-4 w-4 text-red-500" />
                  </span>
                  <div className="text-2xl font-black text-white mt-2">{products.length}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    Pedidos Recibidos <Store className="h-4 w-4 text-red-500" />
                  </span>
                  <div className="text-2xl font-black text-white mt-2">{orders.length}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    Plugins Instalados <Puzzle className="h-4 w-4 text-red-500" />
                  </span>
                  <div className="text-2xl font-black text-white mt-2">
                    {plugins.filter((p) => p.isEnabled).length} / {plugins.length}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    Idiomas Activos <Languages className="h-4 w-4 text-red-500" />
                  </span>
                  <div className="text-2xl font-black text-white mt-2">{languages.length}</div>
                </div>
              </div>

              {/* Isolation Notice */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-white">
                    Garantía de Aislamiento de Tenant (Tenant ID: {activeTenant.id})
                  </h4>
                  <p className="mt-1 text-zinc-400 leading-relaxed">
                    Todos los recursos (catálogo, transacciones, plugins, idiomas y dominios) están estrictamente
                    aislados en PostgreSQL. Ningún otro cliente de la plataforma puede ver o modificar estos datos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS CATALOG SECTION */}
          {activeSection === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Catálogo de Productos ({products.length})
                  </h2>
                  <p className="text-xs text-zinc-400">Gestión de artículos, precios e inventario</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(!showAddProduct)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuevo Producto</span>
                </button>
              </div>

              {showAddProduct && (
                <form
                  onSubmit={handleCreateProduct}
                  className="rounded-xl border border-red-900/60 bg-zinc-950 p-6 space-y-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                    Añadir Producto al Tenant
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Título del Producto</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ej. Sudadera Técnica Fénix"
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">SKU</label>
                      <input
                        type="text"
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value)}
                        placeholder="FNX-PRD-99"
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Precio (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="99.00"
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Stock Disponible</label>
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        placeholder="10"
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500"
                    >
                      Guardar Producto
                    </button>
                  </div>
                </form>
              )}

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Título</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono text-zinc-400">{p.sku}</td>
                        <td className="px-4 py-3 font-bold text-white">{p.title}</td>
                        <td className="px-4 py-3 text-zinc-400">{p.categoryName}</td>
                        <td className="px-4 py-3 font-mono font-bold text-red-400">
                          {p.price.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 font-mono">{p.stock} uds</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                            Publicado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS SECTION */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Pedidos de la Tienda ({orders.length})
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Control de transacciones y estados de verificación de pago
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Nº Pedido</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Estado Pago</th>
                      <th className="px-4 py-3">ID Verificación</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono font-bold text-red-400">{o.orderNumber}</td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{o.customerName}</div>
                          <div className="text-[10px] text-zinc-500">{o.customerEmail}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          {o.totalAmount.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              o.status === 'PAID'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                          {o.paymentVerificationId || 'Sin verificar'}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-500">
                          {formatDate(o.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLUGINS SECTION */}
          {activeSection === 'plugins' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Plugins &amp; Extensiones del CMS
                </h2>
                <p className="text-xs text-zinc-400">
                  Arquitectura modular tipo WordPress pero simplificada y nativa
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 font-mono">
                          {plugin.category} &bull; v{plugin.version}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            plugin.isEnabled
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {plugin.isEnabled ? 'ACTIVO' : 'DESACTIVADO'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{plugin.name}</h3>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {plugin.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleTogglePlugin(plugin.slug)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          plugin.isEnabled
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            : 'bg-red-600 text-white hover:bg-red-500'
                        }`}
                      >
                        {plugin.isEnabled ? 'Desactivar Plugin' : 'Activar Plugin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* THEMES SECTION */}
          {activeSection === 'themes' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Temas y Estilos Visuales
                </h2>
                <p className="text-xs text-zinc-400">
                  Selecciona la estética visual de tu escaparate público
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between transition ${
                      theme.isActive
                        ? 'border-red-600 bg-zinc-900/90 ring-1 ring-red-500 shadow-xl'
                        : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="h-4 w-4 rounded-full border border-zinc-600"
                          style={{ backgroundColor: theme.previewColor }}
                        />
                        {theme.isActive && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">{theme.name}</h3>
                      <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-3 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleActivateTheme(theme.slug)}
                        disabled={theme.isActive}
                        className={`w-full rounded-lg py-2 text-xs font-bold transition ${
                          theme.isActive
                            ? 'bg-zinc-800 text-zinc-500 cursor-default'
                            : 'bg-red-600 text-white hover:bg-red-500'
                        }`}
                      >
                        {theme.isActive ? 'Tema en Uso' : 'Activar Tema'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOMAINS SECTION */}
          {activeSection === 'domains' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Gestión Multidominio &amp; SSL
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Conecta múltiples dominios y nombres personalizados a este tenant
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddDomain}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex gap-3"
              >
                <input
                  type="text"
                  value={newDomainHost}
                  onChange={(e) => setNewDomainHost(e.target.value)}
                  placeholder="ejemplo-tienda.com"
                  className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
                >
                  Vincular Dominio
                </button>
              </form>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Nombre de Dominio</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Verificación DNS</th>
                      <th className="px-4 py-3">Estado SSL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {domains.map((dom) => (
                      <tr key={dom.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono font-bold text-white">{dom.hostname}</td>
                        <td className="px-4 py-3">
                          {dom.isPrimary ? (
                            <span className="rounded bg-red-950 border border-red-800 px-2 py-0.5 text-[10px] text-red-300 font-bold">
                              Principal
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Alias Adicional</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-emerald-400">Verificado</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                            {dom.sslStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LANGUAGES SECTION */}
          {activeSection === 'languages' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Configuración Multiidioma
                </h2>
                <p className="text-xs text-zinc-400">
                  Idiomas habilitados para el escaparate público de este tenant
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Por Defecto</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {languages.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono uppercase font-bold text-red-400">
                          {l.code}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{l.name}</td>
                        <td className="px-4 py-3">
                          {l.isDefault ? (
                            <span className="text-emerald-400 font-bold">Sí</span>
                          ) : (
                            <span className="text-zinc-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                            Habilitado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CMS PAGES SECTION */}
          {activeSection === 'pages' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Páginas CMS ({pages.length})
                </h2>
                <p className="text-xs text-zinc-400">Gestor de contenidos estáticos y dinámicos</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Ruta / Slug</th>
                      <th className="px-4 py-3">Título</th>
                      <th className="px-4 py-3">Idioma</th>
                      <th className="px-4 py-3">Última Modificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {pages.map((page) => (
                      <tr key={page.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono text-zinc-400">/{page.slug}</td>
                        <td className="px-4 py-3 font-bold text-white">{page.title}</td>
                        <td className="px-4 py-3 uppercase font-mono text-red-400">{page.languageCode}</td>
                        <td className="px-4 py-3 font-mono text-zinc-500">
                          {formatDate(page.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS SECTION */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Configuración del Tenant
                </h2>
                <p className="text-xs text-zinc-400">Ajustes generales y control de suscripción</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Nombre Comercial:</span>
                  <div className="text-white font-bold">{activeTenant.name}</div>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Subdominio Interno:</span>
                  <div className="font-mono text-zinc-300">{activeTenant.slug}.fenixcms.app</div>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Plan de Suscripción:</span>
                  <div className="text-red-400 font-bold">{activeTenant.planName}</div>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <Link
                    href="/planes"
                    className="inline-block rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                  >
                    Mejorar Plan de Licencia
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default function TenantAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs font-mono">
          Cargando panel de administración CMS...
        </div>
      }
    >
      <TenantAdminContent />
    </Suspense>
  );
}
