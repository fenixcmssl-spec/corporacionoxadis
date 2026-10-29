'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  ShoppingBag,
  Puzzle,
  Palette,
  Globe2,
  Languages,
  Settings,
  Store,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { TenantDto } from '../../lib/types/fenix';

interface TenantSidebarProps {
  tenants: TenantDto[];
  activeTenant: TenantDto;
  onSelectTenant: (tenant: TenantDto) => void;
  activeSection: string;
  onSelectSection: (section: string) => void;
}

export default function TenantSidebar({
  tenants,
  activeTenant,
  onSelectTenant,
  activeSection,
  onSelectSection,
}: TenantSidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Visión General', icon: Layers },
    { id: 'pages', label: 'Páginas CMS', icon: FileText },
    { id: 'products', label: 'Tienda & Catálogo', icon: ShoppingBag },
    { id: 'orders', label: 'Pedidos Recibidos', icon: Store },
    { id: 'plugins', label: 'Plugins & Extensiones', icon: Puzzle },
    { id: 'themes', label: 'Temas & Diseño', icon: Palette },
    { id: 'domains', label: 'Dominios & SSL', icon: Globe2 },
    { id: 'languages', label: 'Multiidioma', icon: Languages },
    { id: 'settings', label: 'Configuración Tenant', icon: Settings },
  ];

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
      <div>
        {/* Tenant Switcher Selector */}
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>Espacio de Tenant</span>
            <span className="text-emerald-400 font-mono text-[9px] bg-emerald-950/60 border border-emerald-800/60 px-1 rounded">
              AISLADO
            </span>
          </label>
          <select
            value={activeTenant.id}
            onChange={(e) => {
              const selected = tenants.find((t) => t.id === e.target.value);
              if (selected) onSelectTenant(selected);
            }}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs font-semibold text-white focus:border-red-500 focus:outline-none"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] font-mono text-zinc-400 truncate">
            {activeTenant.customDomain}
          </p>
        </div>

        {/* Navigation Items - NO SEARCH BAR */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      <div className="mt-6 pt-4 border-t border-zinc-800/80">
        <Link
          href="/tienda"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-900/40 transition"
        >
          <Store className="h-3.5 w-3.5" />
          <span>Ver Tienda Pública</span>
        </Link>
        <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Licencia: {activeTenant.planName}</span>
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
        </div>
      </div>
    </aside>
  );
}
