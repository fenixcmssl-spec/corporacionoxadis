'use client';

import React from 'react';
import { Users, ShieldCheck, Mail, Building, Key } from 'lucide-react';
import { fenixDb } from '../../../lib/db/client';

export default function SuperAdminUsersPage() {
  const tenants = fenixDb.getTenants();

  const usersList = [
    {
      id: 'usr_root_01',
      name: 'SuperAdmin Principal',
      email: 'superadmin@fenixcms.io',
      role: 'SUPERADMIN_ROOT',
      tenant: 'Plataforma Global',
      status: 'ACTIVE',
      twoFactor: true,
      lastLogin: '2026-10-22 03:30',
    },
    {
      id: 'usr_moda_01',
      name: 'Roberto Fénix (Moda)',
      email: 'admin@modaurbana.es',
      role: 'TENANT_OWNER',
      tenant: 'Fénix Moda Urbana',
      status: 'ACTIVE',
      twoFactor: false,
      lastLogin: '2026-10-21 19:40',
    },
    {
      id: 'usr_tech_02',
      name: 'Elena Gómez (Tech)',
      email: 'admin@techgadgets.es',
      role: 'TENANT_OWNER',
      tenant: 'Fénix Tech & Gadgets',
      status: 'ACTIVE',
      twoFactor: true,
      lastLogin: '2026-10-22 01:15',
    },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Users className="h-4 w-4" />
            <span>Control de Identidades Globales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Usuarios &amp; Operadores
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de credenciales, roles de acceso y aislamiento de cuentas SaaS
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Directorio de Cuentas ({usersList.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">Bcrypt Password Verification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 font-mono border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Nombre &amp; Correo</th>
                <th className="px-6 py-3">Rol de Sistema</th>
                <th className="px-6 py-3">Espacio / Tenant</th>
                <th className="px-6 py-3">2FA</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Último Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {usersList.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{user.name}</div>
                    <div className="text-zinc-500 font-mono text-[11px]">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        user.role === 'SUPERADMIN_ROOT'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{user.tenant}</td>
                  <td className="px-6 py-4">
                    {user.twoFactor ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="h-3 w-3" /> Activo
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500 text-[11px]">{user.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
