'use client';

import React from 'react';
import { CreditCard, Calendar, CheckCircle2, RefreshCw } from 'lucide-react';
import { superAdminService } from '../../../lib/services/superadmin.service';
import { formatDate } from '../../../lib/utils/format';

export default function SuperAdminSubscriptionsPage() {
  const subscriptions = superAdminService.getSubscriptions();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <CreditCard className="h-4 w-4" />
            <span>Facturación Recurrente SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Suscripciones Activas
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Control de ciclos de cobro mensual/anual y estado de renovación automática
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Contratos de Suscripción ({subscriptions.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">Tabla: tenant_subscriptions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Tenant / Cliente</th>
                <th className="px-6 py-3">Plan Contratado</th>
                <th className="px-6 py-3">Ciclo</th>
                <th className="px-6 py-3">Cuota Recurrente</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Próxima Renovación</th>
                <th className="px-6 py-3">Auto-Renovación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{sub.tenantName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{sub.tenantId}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300 font-semibold">{sub.planName}</td>
                  <td className="px-6 py-4 font-mono text-zinc-400">{sub.billingCycle}</td>
                  <td className="px-6 py-4 font-mono font-bold text-red-400">
                    {sub.price.toFixed(2)} € / mes
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-400">
                    {formatDate(sub.currentPeriodEnd)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                      <RefreshCw className="h-3 w-3" /> Habilitada
                    </span>
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
