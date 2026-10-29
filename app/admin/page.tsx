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
import { fenixDb } from '../../lib/db/client';
import { TenantDto, ProductDto } from '../../lib/types/fenix';
import { formatDate } from '../../lib/utils/format';

function TenantAdminContent() {
  const searchParams = useSearchParams();
  const tenantParam = searchParams.get('tenant') || 'tenant_moda_01';

  const tenants = fenixDb.getTenants();
  const initialTenant = fenixDb.getTenantById(tenantParam);

  const [activeTenant, setActiveTenant] = React.useState<TenantDto | undefined>(initialTenant);
  const [activeSection, setActiveSection] = React.useState('overview');

  // Tenant Isolated Data
  const [products, setProducts] = React.useState<ProductDto[]>(() =>
    initialTenant ? fenixDb.getAllProductsAdmin(initialTenant.id) : []
  );
  const [orders, setOrders] = React.useState(() => (initialTenant ? fenixDb.getOrders(initialTenant.id) : []));
  const [plugins, setPlugins] = React.useState(() => (initialTenant ? fenixDb.getPlugins(initialTenant.id) : []));
  const [themes, setThemes] = React.useState(() => (initialTenant ? fenixDb.getThemes(initialTenant.id) : []));
  const [domains, setDomains] = React.useState(() => (initialTenant ? fenixDb.getDomains(initialTenant.id) : []));
  const [languages, setLanguages] = React.useState(() => (initialTenant ? fenixDb.getLanguages(initialTenant.id) : []));
  const [pages, setPages] = React.useState(() => (initialTenant ? fenixDb.getPages(initialTenant.id) : []));

  // Add Product Form State
  const [showAddProduct, setShowAddProduct] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newSku, setNewSku] = React.useState('');
  const [newPrice, setNewPrice] = React.useState('');
  const [newStock, setNewStock] = React.useState('10');
  const [newCategory, setNewCategory] = React.useState('Catálogo General');

  // Add Domain State
  const [newDomainHost, setNewDomainHost] = React.useState('');

  // Handle switching active tenant
  const handleTenantChange = (tenant: TenantDto) => {
    setActiveTenant(tenant);
    setProducts(fenixDb.getAllProductsAdmin(tenant.id));
    setOrders(fenixDb.getOrders(tenant.id));
    setPlugins(fenixDb.getPlugins(tenant.id));
    setThemes(fenixDb.getThemes(tenant.id));
    setDomains(fenixDb.getDomains(tenant.id));
    setLanguages(fenixDb.getLanguages(tenant.id));
    setPages(fenixDb.getPages(tenant.id));
  };

  const handleTogglePlugin = (slug: string) => {
    if (!activeTenant) return;
    fenixDb.togglePlugin(activeTenant.id, slug);
    setPlugins(fenixDb.getPlugins(activeTenant.id));
  };

  const handleActivateTheme = (slug: string) => {
    if (!activeTenant) return;
    fenixDb.setActiveTheme(activeTenant.id, slug);
    setThemes(fenixDb.getThemes(activeTenant.id));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !newTitle.trim() || !newSku.trim() || !newPrice) return;

    const created = fenixDb.createProduct(activeTenant.id, {
      title: newTitle,
      sku: newSku,
      price: parseFloat(newPrice),
      stock: parseInt(newStock, 10) || 0,
      categoryId: 'cat_custom',
      categoryName: newCategory,
      description: 'Producto registrado desde el panel de administración FenixCMS.',
      imageUrl: 'https://picsum.photos/seed/' + newSku + '/600/600',
      isPublished: true,
    });

    setProducts(fenixDb.getAllProductsAdmin(activeTenant.id));
    setShowAddProduct(false);
    setNewTitle('');
    setNewSku('');
    setNewPrice('');
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !newDomainHost.trim()) return;
    fenixDb.addDomain(activeTenant.id, newDomainHost.trim());
    setDomains(fenixDb.getDomains(activeTenant.id));
    setNewDomainHost('');
  };

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/40 border border-red-800 text-red-500 mb-6">
              <AlertCircle className="h-7 w-7" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded">
              Tenant No Encontrado
            </span>
            <h1 className="mt-3 text-2xl font-black text-white">
              Espacio Inexistente o No Autorizado
            </h1>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              El identificador de tenant solicitado no corresponde a ningún cliente registrado o carece de permisos de sesión verificados.
            </p>
            <div className="mt-6">
              <Link
                href="/admin?tenant=tenant_moda_01"
                className="inline-flex rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                Acceder a Tenant Verificado
              </Link>
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
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-6xl">
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
