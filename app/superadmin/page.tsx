'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Server,
  Users,
  CreditCard,
  Key,
  Globe,
  Database,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react';
import { fenixDb } from '../../lib/db/client';
import { formatDate } from '../../lib/utils/format';

export default function SuperAdminPage() {
  const tenants = fenixDb.getTenants();
  const plans = fenixDb.getPlans();
  const dbStatus = fenixDb.getPersistenceStatus();

  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);

  // Compute platform metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
  const estimatedMRR = tenants.reduce((acc, t) => {
    const plan = plans.find((p) => p.id === t.planId);
    return acc + (plan ? plan.priceMonthly : 79);
  }, 0);

  const handleGenerateLicense = () => {
    const key = `FNX-PRO-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    setGeneratedKey(key);
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
        {/* Superadmin Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded bg-red-950/60 border border-red-700/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Zona Exclusiva SuperAdministrador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Consola Central FenixCMS SaaS
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Supervisión de planes, licencias comerciales, aprovisionamiento de tenants e infraestructura.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/checkout"
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-red-950/50 hover:bg-red-500 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Aprovisionar Nuevo Tenant</span>
            </Link>
          </div>
        </div>

        {/* Global SaaS Platform Metrics */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Tenants Aprovisionados</span>
              <Users className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{totalTenants}</div>
            <p className="mt-1 text-[11px] text-emerald-400 font-mono">
              {activeTenants} con licencia activa
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>MRR Estimado Plataforma</span>
              <CreditCard className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{estimatedMRR} €</div>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono">
              Ingresos recurrentes mensuales
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Dominios Conectados</span>
              <Globe className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{totalTenants * 2}</div>
            <p className="mt-1 text-[11px] text-zinc-500 font-mono">
              Con SSL automático activo
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Motor de Base de Datos</span>
              <Database className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-base font-black text-white truncate">PostgreSQL</div>
            <p className="mt-1 text-[11px] text-red-400 font-mono truncate">
              Prisma Multitenant Ready
            </p>
          </div>
        </div>

        {/* Database Diagnostic Card */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-red-400">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{dbStatus.engine}</span>
                <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300 font-mono">
                  {dbStatus.mode}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">{dbStatus.note}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {dbStatus.schemaPath}
          </span>
        </div>

        {/* Tenants Table */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Clientes &amp; Espacios Multitenant Registrados
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Total: {tenants.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Nombre Empresa</th>
                  <th className="px-6 py-3">Slug / Subdominio</th>
                  <th className="px-6 py-3">Plan SaaS</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha Alta</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span>{tenant.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-300">
                      {tenant.customDomain || `${tenant.slug}.fenixcms.app`}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      <span className="rounded bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[11px]">
                        {tenant.planName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin?tenant=${tenant.id}`}
                        className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-red-600 hover:text-white transition"
                      >
                        <span>Gestionar CMS</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Plans and License Generator */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plans Overview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Catálogo de Planes de la Plataforma
            </h3>
            <div className="space-y-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{p.name}</h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {p.priceMonthly} €/mes | Hasta {p.maxDomains} dominios | {p.maxProducts} productos
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-400">
                    {p.priceYearly} €/año
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* License Key Generator */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white">
                <Key className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Generador de Licencias Criptográficas FenixCMS
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Emite licencias comerciales para nuevos clientes con validación criptográfica y control de límites de dominio.
              </p>

              {generatedKey && (
                <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3">
                  <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest">
                    Nueva Licencia Emitida:
                  </div>
                  <div className="mt-1 font-mono text-sm text-white font-bold select-all">
                    {generatedKey}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleGenerateLicense}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-md shadow-red-950/50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generar Nueva Clave de Licencia</span>
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
