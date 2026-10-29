'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Clock, CheckCircle } from 'lucide-react';
import { superAdminService } from '../../../lib/services/superadmin.service';
import { formatDateTime } from '../../../lib/utils/format';

export default function SuperAdminAuditPage() {
  const logs = superAdminService.getAuditLogs();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <ShieldAlert className="h-4 w-4" />
            <span>Trazabilidad de Seguridad</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Registro de Auditoría de la Plataforma
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Eventos críticos de sistema, generación de licencias, transacciones y alertas de aislamiento
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Histórico Inmutable ({logs.length} eventos)
          </span>
          <span className="text-xs text-zinc-500 font-mono">Retención: 365 días</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Nivel</th>
                <th className="px-6 py-3">Acción Registrada</th>
                <th className="px-6 py-3">Actor / Origen</th>
                <th className="px-6 py-3">Detalles del Evento</th>
                <th className="px-6 py-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        log.severity === 'WARNING' || log.severity === 'CRITICAL'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">{log.action}</td>
                  <td className="px-6 py-4 font-mono text-zinc-400 text-[11px]">{log.actor}</td>
                  <td className="px-6 py-4 text-zinc-300 max-w-md">{log.details}</td>
                  <td className="px-6 py-4 font-mono text-zinc-500 text-[11px]">
                    {formatDateTime(log.timestamp)}
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
