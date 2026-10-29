'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Globe2, ShieldCheck, ArrowUpRight, AlertCircle, PlusCircle } from 'lucide-react';
import { fenixDb } from '../../../lib/db/client';
import { TenantDto } from '../../../lib/types/fenix';
import { formatDate } from '../../../lib/utils/format';

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = React.useState<TenantDto[]>(() => fenixDb.getTenants());

  const handleToggleStatus = (tenantId: string) => {
    const updated = tenants.map((t) => {
      if (t.id === tenantId) {
        return {
          ...t,
          status: (t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE') as any,
        };
      }
      return t;
    });
    setTenants(updated);
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Building2 className="h-4 w-4" />
            <span>Gestión Multitenant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Tenants &amp; Clientes SaaS
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Supervisión de espacios aislados, límites de catálogo y estado operativo
          </p>
        </div>

        <Link
          href="/checkout"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Aprovisionar Nuevo Tenant</span>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Espacios Aprovisionados ({tenants.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">Aislamiento por Tenant ID</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Organización / Tenant</th>
                <th className="px-6 py-3">Subdominio FenixCMS</th>
                <th className="px-6 py-3">Plan Activo</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Alta</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{t.id}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-red-400">
                    {t.customDomain || `${t.slug}.fenixcms.app`}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    <span className="rounded bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[11px]">
                      {t.planName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500 text-[11px]">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(t.id)}
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                        t.status === 'ACTIVE'
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800'
                      }`}
                    >
                      {t.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <Link
                      href={`/admin?tenant=${t.id}`}
                      className="inline-flex items-center gap-1 rounded bg-red-600/20 text-red-400 border border-red-800/40 px-2.5 py-1 text-[11px] font-semibold hover:bg-red-600 hover:text-white transition"
                    >
                      <span>Auditar CMS</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
