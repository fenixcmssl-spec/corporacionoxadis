'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Tag,
  Key,
  CreditCard,
  Receipt,
  ShieldAlert,
  Sliders,
  LogOut,
  Flame,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/superadmin', label: 'Panel Global', icon: LayoutDashboard },
    { href: '/superadmin/users', label: 'Usuarios & Accesos', icon: Users },
    { href: '/superadmin/tenants', label: 'Tenants & Clientes', icon: Building2 },
    { href: '/superadmin/plans', label: 'Planes SaaS', icon: Tag },
    { href: '/superadmin/licenses', label: 'Licencias Criptográficas', icon: Key },
    { href: '/superadmin/subscriptions', label: 'Suscripciones', icon: CreditCard },
    { href: '/superadmin/payments', label: 'Pagos & Transacciones', icon: Receipt },
    { href: '/superadmin/audit', label: 'Registro de Auditoría', icon: ShieldAlert },
    { href: '/superadmin/settings', label: 'Configuración de Sistema', icon: Sliders },
  ];

  return (
    <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between flex-shrink-0">
      <div>
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-zinc-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white font-bold shadow-md shadow-red-950/60">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wider text-white flex items-center gap-1.5">
              <span>SUPERADMIN</span>
              <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 rounded font-mono">
                ROOT
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">FenixCMS Console</p>
          </div>
        </div>

        {/* Navigation - Prohibida la barra de búsqueda */}
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Nav */}
      <div className="pt-4 border-t border-zinc-800/80 space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
        >
          <span>Ir a Portal Público</span>
          <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
        </Link>

        <Link
          href="/superadmin/login"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:text-red-400 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Cerrar Sesión Root</span>
        </Link>
      </div>
    </aside>
  );
}
