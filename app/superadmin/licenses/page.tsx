'use client';

import React from 'react';
import { Key, Sparkles, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { superAdminService } from '../../../lib/services/superadmin.service';
import { fenixDb } from '../../../lib/db/client';
import { formatDate } from '../../../lib/utils/format';

export default function SuperAdminLicensesPage() {
  const [licenses, setLicenses] = React.useState(() => superAdminService.getLicenses());
  const tenants = fenixDb.getTenants();

  const [selectedTenantId, setSelectedTenantId] = React.useState(tenants[0]?.id || '');
  const [maxDomains, setMaxDomains] = React.useState(2);
  const [durationDays, setDurationDays] = React.useState(365);
  const [createdLicense, setCreatedLicense] = React.useState<any>(null);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    const newLic = superAdminService.issueLicense({
      tenantId: selectedTenantId,
      maxDomains: Number(maxDomains),
      durationDays: Number(durationDays),
    });
    setLicenses([...superAdminService.getLicenses()]);
    setCreatedLicense(newLic);
  };

  const handleRevoke = (licId: string) => {
    superAdminService.revokeLicense(licId);
    setLicenses([...superAdminService.getLicenses()]);
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Key className="h-4 w-4" />
            <span>Seguridad &amp; Licenciamiento Criptográfico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Licencias de FenixCMS
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Emisión, validación y revocación de claves de autorización comercial
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-red-500" />
          <span>Generar Nueva Clave de Licencia</span>
        </h2>

        {createdLicense && (
          <div className="mb-6 rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Licencia Emitida y Registrada en Base de Datos</span>
            </div>
            <div className="font-mono text-sm text-white select-all mt-2 p-2 rounded bg-black border border-emerald-900">
              {createdLicense.licenseKey}
            </div>
            <p className="mt-2 text-zinc-400 text-[11px]">
              Asignada a: <span className="text-white font-semibold">{createdLicense.tenantName}</span> &bull; Expira: {formatDate(createdLicense.expiresAt)}
            </p>
          </div>
        )}

        <form onSubmit={handleIssue} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tenant Destinatario</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Límite Dominios</label>
            <input
              type="number"
              min="1"
              value={maxDomains}
              onChange={(e) => setMaxDomains(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Vigencia (Días)</label>
            <input
              type="number"
              min="30"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:bg-red-500 transition active:scale-95"
            >
              Emitir Licencia
            </button>
          </div>
        </form>
      </div>

      {/* Licenses Table */}
      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Licencias Emitidas ({licenses.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">Control de Expansión Multidominio</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Clave de Licencia</th>
                <th className="px-6 py-3">Tenant Asignado</th>
                <th className="px-6 py-3">Máx Dominios</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha Emisión</th>
                <th className="px-6 py-3">Expiración</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {licenses.map((lic) => (
                <tr key={lic.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4 font-mono font-bold text-red-400 select-all">
                    {lic.licenseKey}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{lic.tenantName}</td>
                  <td className="px-6 py-4 font-mono">{lic.maxDomains}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        lic.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500">
                    {formatDate(lic.issuedAt)}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500">
                    {formatDate(lic.expiresAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {lic.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => handleRevoke(lic.id)}
                        className="rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-red-600 hover:text-white transition"
                      >
                        Revocar
                      </button>
                    ) : (
                      <span className="text-zinc-600 font-mono text-[11px]">Revocada</span>
                    )}
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
