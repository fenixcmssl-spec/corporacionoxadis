'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Flame,
  Building,
  Mail,
  KeyRound,
  CreditCard,
} from 'lucide-react';
import { fenixDb } from '../../lib/db/client';
import { checkoutSchema } from '../../lib/security/validators';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planParam = searchParams.get('plan') || 'pro';
  const cycleParam = (searchParams.get('cycle') as 'MONTHLY' | 'YEARLY') || 'MONTHLY';

  const [selectedPlanSlug, setSelectedPlanSlug] = React.useState(planParam);
  const [billingCycle, setBillingCycle] = React.useState<'MONTHLY' | 'YEARLY'>(cycleParam);

  const [tenantName, setTenantName] = React.useState('');
  const [tenantSlug, setTenantSlug] = React.useState('');
  const [adminName, setAdminName] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [simulateVerifiedPayment, setSimulateVerifiedPayment] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<{
    tenantSlug: string;
    domain: string;
    licenseKey: string;
    status: string;
  } | null>(null);

  const plans = fenixDb.getPlans();
  const currentPlan = plans.find((p) => p.slug === selectedPlanSlug) || plans[1];

  const subtotal = billingCycle === 'MONTHLY' ? currentPlan.priceMonthly : currentPlan.priceYearly;
  const vat = Number((subtotal * 0.21).toFixed(2));
  const total = Number((subtotal + vat).toFixed(2));

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setTenantName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    setTenantSlug(generatedSlug);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate using Zod schema
    const validation = checkoutSchema.safeParse({
      planSlug: selectedPlanSlug,
      billingCycle,
      tenantName,
      tenantSlug,
      adminName,
      adminEmail,
      adminPassword,
    });

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Error de validación en el formulario.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create tenant in data repository
      const newTenant = fenixDb.createTenant({
        name: tenantName,
        slug: tenantSlug,
        planSlug: selectedPlanSlug,
        adminEmail,
      });

      const licenseKey = `FNX-LIC-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      setSuccessData({
        tenantSlug: newTenant.slug,
        domain: newTenant.customDomain || `${newTenant.slug}.fenixcms.app`,
        licenseKey,
        status: simulateVerifiedPayment ? 'ACTIVE' : 'TRIAL_PENDING_PAYMENT',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al aprovisionar el nuevo espacio de tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 border-b border-zinc-800 pb-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-red-500 uppercase tracking-widest mb-2">
              <Flame className="h-4 w-4" />
              <span>Contratación de Licencia FenixCMS SaaS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Aprovisionamiento de Nuevo Tenant CMS
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Configura tu espacio exclusivo, credenciales de administración y vinculación de dominio.
            </p>
          </div>

          {successData ? (
            <div className="rounded-2xl border border-emerald-800/80 bg-zinc-900/90 p-8 shadow-2xl text-center max-w-2xl mx-auto space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">¡Tenant Creado y Licenciado!</h2>
                <p className="mt-2 text-xs text-zinc-400">
                  Tu espacio en FenixCMS ha sido aprovisionado con aislamiento de base de datos garantizado.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Identificador Tenant:</span>
                  <span className="text-white font-bold">{successData.tenantSlug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Dominio Asignado:</span>
                  <span className="text-red-400 font-bold">{successData.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Clave de Licencia:</span>
                  <span className="text-zinc-200">{successData.licenseKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Estado de Aprovisionamiento:</span>
                  <span className="text-emerald-400 font-bold">{successData.status}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/admin"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:bg-red-500 transition"
                >
                  <span>Ir al CMS del Tenant (/admin)</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/tienda"
                  className="w-full sm:w-auto rounded-lg bg-zinc-800 px-6 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Ver Tienda Pública
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Formulario de Contratación */}
              <div className="lg:col-span-7">
                <form
                  onSubmit={handleCheckoutSubmit}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-6"
                >
                  {errorMessage && (
                    <div className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Sección 1: Selección de Plan */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                      1. Confirmar Plan FenixCMS
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {plans.map((p) => (
                        <button
                          key={p.slug}
                          type="button"
                          onClick={() => setSelectedPlanSlug(p.slug)}
                          className={`rounded-lg p-2.5 text-left border text-xs transition ${
                            selectedPlanSlug === p.slug
                              ? 'border-red-600 bg-red-950/30 text-white font-bold'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="truncate font-semibold">{p.name.replace('Fenix ', '')}</div>
                          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                            {billingCycle === 'MONTHLY' ? `${p.priceMonthly}€/m` : `${p.priceYearly}€/a`}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sección 2: Datos del Espacio / Tenant */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                      2. Espacio de Empresa / Tienda (Tenant)
                    </label>

                    <div>
                      <label htmlFor="tenant-name" className="block text-xs text-zinc-400 mb-1">
                        Nombre de la Marca o Negocio
                      </label>
                      <input
                        id="tenant-name"
                        type="text"
                        value={tenantName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Ej. Fénix Shoes & Boutique"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="tenant-slug" className="block text-xs text-zinc-400 mb-1">
                        Identificador de Subdominio (Slug)
                      </label>
                      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden focus-within:border-red-500">
                        <input
                          id="tenant-slug"
                          type="text"
                          value={tenantSlug}
                          onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                          placeholder="mi-tienda"
                          className="flex-1 bg-transparent px-3.5 py-2 text-xs text-white focus:outline-none"
                          required
                        />
                        <span className="bg-zinc-800 px-3 py-2 text-xs font-mono text-zinc-400 border-l border-zinc-700">
                          .fenixcms.app
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sección 3: Credenciales del Administrador */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                      3. Administrador Principal del CMS
                    </label>

                    <div>
                      <label htmlFor="admin-name" className="block text-xs text-zinc-400 mb-1">
                        Nombre del Administrador
                      </label>
                      <input
                        id="admin-name"
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Ej. Roberto Fénix"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="admin-email" className="block text-xs text-zinc-400 mb-1">
                        Correo de Acceso
                      </label>
                      <input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@mitienda.es"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="admin-pass" className="block text-xs text-zinc-400 mb-1">
                        Contraseña (mínimo 8 caracteres, se almacena con Bcrypt)
                      </label>
                      <input
                        id="admin-pass"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Regla de Seguridad de Pagos */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateVerifiedPayment}
                        onChange={(e) => setSimulateVerifiedPayment(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-red-600 focus:ring-red-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-zinc-200">
                          Confirmación de Pago Verificado (Pasarela Segura)
                        </span>
                        <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">
                          Cumple la Regla 5 de Seguridad: los estados de pago no se marcan completados
                          sin verificación criptográfica bancaria del token de transacción.
                        </p>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-xl shadow-red-950/60 hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {isSubmitting
                        ? 'Aprovisionando Tenant...'
                        : `Contratar y Activar Tenant (${total} €)`}
                    </span>
                  </button>
                </form>
              </div>

              {/* Resumen Comercial Lateral */}
              <div className="lg:col-span-5">
                <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-zinc-800 pb-3">
                    Resumen del Pedido SaaS
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Plan Seleccionado:</span>
                      <span className="font-bold text-white">{currentPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ciclo de Facturación:</span>
                      <span className="font-mono text-zinc-200">
                        {billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual (2m gratis)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Límite de Dominios:</span>
                      <span className="text-zinc-200">{currentPlan.maxDomains} dominio(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Catálogo de Productos:</span>
                      <span className="text-zinc-200">Hasta {currentPlan.maxProducts}</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Base Imponible:</span>
                      <span className="font-mono">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>IVA Aplicable (21%):</span>
                      <span className="font-mono">{vat.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-zinc-800/80">
                      <span>Total Factura:</span>
                      <span className="font-mono text-red-400">{total.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-400 space-y-1.5 border border-zinc-800">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                      <Lock className="h-3 w-3 text-red-500" />
                      <span>Transacción Cifrada TLS 1.3</span>
                    </div>
                    <p className="text-zinc-500">
                      Facturación recurrente. Puedes modificar o cancelar tu suscripción en cualquier momento desde el portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs font-mono">
          Cargando proceso de contratación FenixCMS...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
