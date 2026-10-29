'use client';

import React from 'react';
import { Receipt, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { superAdminService } from '../../../lib/services/superadmin.service';
import { formatDateTime } from '../../../lib/utils/format';

export default function SuperAdminPaymentsPage() {
  const payments = superAdminService.getPayments();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Receipt className="h-4 w-4" />
            <span>Integridad de Pasarela de Pagos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Pagos &amp; Transacciones
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Auditoría de cobros con token criptográfico de confirmación bancaria
          </p>
        </div>
      </div>

      {/* Regla de Seguridad Notice */}
      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-white">Regla 5 de Seguridad FenixCMS: Verificación Criptográfica</h4>
          <p className="mt-1 text-zinc-400 leading-relaxed">
            Ninguna transacción se marca como verificada ni completada sin un identificador de verificación
            bancaria (`FENIX_PAY_...`). Las transacciones pendientes quedan bloqueadas para entrega de licencias.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Registro de Transacciones ({payments.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">Tabla: store_orders / payments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Nº Pedido</th>
                <th className="px-6 py-3">Tenant Emisor</th>
                <th className="px-6 py-3">Importe</th>
                <th className="px-6 py-3">Estado Verificación</th>
                <th className="px-6 py-3">Token Criptográfico</th>
                <th className="px-6 py-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4 font-mono font-bold text-white">{pay.orderNumber}</td>
                  <td className="px-6 py-4 text-zinc-300 font-medium">{pay.tenantName}</td>
                  <td className="px-6 py-4 font-mono font-bold text-red-400">
                    {pay.amount.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        pay.status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 select-all">
                    {pay.verificationCode}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500 text-[11px]">
                    {formatDateTime(pay.date)}
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
