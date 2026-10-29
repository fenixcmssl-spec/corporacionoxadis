'use client';

import React from 'react';
import {
  ShoppingBag,
  Globe,
  Check,
  Store,
  Newspaper,
  Building2,
  Gavel,
  Tag,
  Users,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { LanguageDto, FenixModuleType, TenantBrandingDto } from '../../lib/types/fenix';

interface StoreHeaderProps {
  tenantName: string;
  domainName: string;
  branding?: TenantBrandingDto;
  authorizedModules: FenixModuleType[];
  activeModule: FenixModuleType;
  onSelectModule: (module: FenixModuleType) => void;
  languages: LanguageDto[];
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const MODULE_DEFINITIONS: Record<
  FenixModuleType,
  { label: string; shortLabel: string; icon: React.ElementType }
> = {
  ecommerce: { label: 'Tienda Online', shortLabel: 'Catálogo', icon: Store },
  blog: { label: 'Blog & Editorial', shortLabel: 'Blog', icon: Newspaper },
  inmobiliaria: { label: 'Inmobiliaria', shortLabel: 'Inmuebles', icon: Building2 },
  subastas: { label: 'Subastas en Vivo', shortLabel: 'Subastas', icon: Gavel },
  clasificados: { label: 'Anuncios Clasificados', shortLabel: 'Clasificados', icon: Tag },
  personales: { label: 'Anuncios Personales', shortLabel: 'Personales', icon: Users },
};

export default function StoreHeader({
  tenantName,
  domainName,
  branding,
  authorizedModules,
  activeModule,
  onSelectModule,
  languages,
  currentLanguage,
  onLanguageChange,
  cartCount,
  onOpenCart,
}: StoreHeaderProps) {
  const [langMenuOpen, setLangMenuOpen] = React.useState(false);

  const accent = branding?.accentColor || '#dc2626';

  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-40">
      {/* Top Bar: Verified Domain & Contact Info */}
      <div className="border-b border-zinc-800/80 px-4 py-1.5 sm:px-6 lg:px-8 text-xs bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-1.5 font-mono text-zinc-300 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{domainName}</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded ml-1">
                <ShieldCheck className="h-3 w-3" /> SSL Verificado
              </span>
            </div>

            {branding?.address && (
              <span className="hidden lg:flex items-center gap-1 text-zinc-500 text-[11px] truncate">
                <span className="text-zinc-700">|</span>
                <MapPin className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                <span className="truncate">{branding.address}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {branding?.contactPhone && (
              <a
                href={`tel:${branding.contactPhone}`}
                className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition font-mono"
              >
                <Phone className="h-3 w-3 text-red-500" />
                <span>{branding.contactPhone}</span>
              </a>
            )}

            {/* Language Selector */}
            {languages.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1.5 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-zinc-300 hover:text-white transition font-mono text-[11px]"
                  aria-label="Seleccionar idioma del sitio"
                  aria-expanded={langMenuOpen}
                >
                  <Globe className="h-3 w-3 text-red-500" />
                  <span className="uppercase">{currentLanguage}</span>
                </button>

                {langMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-32 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl z-50 text-xs"
                    role="menu"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          onLanguageChange(lang.code);
                          setLangMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded px-2.5 py-1 text-left text-zinc-200 hover:bg-zinc-800 transition"
                        role="menuitem"
                      >
                        <span>{lang.name}</span>
                        {currentLanguage === lang.code && <Check className="h-3.5 w-3.5 text-red-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tenant Brand Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl font-black text-white text-lg shadow-lg border border-white/10"
            style={{ backgroundColor: accent }}
          >
            {tenantName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">{tenantName}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                style={{
                  color: accent,
                  borderColor: `${accent}40`,
                  backgroundColor: `${accent}15`,
                }}
              >
                Sitio Oficial
              </span>
            </div>
            {branding?.tagline && (
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl truncate hidden sm:block">
                {branding.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Cart Drawer Trigger for Ecommerce */}
        {authorizedModules.includes('ecommerce') && (
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex items-center gap-2 rounded-xl bg-red-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95"
            aria-label={`Ver cesta de compras con ${cartCount} artículos`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden md:inline">Cesta</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] font-mono font-black text-white border border-red-400">
              {cartCount}
            </span>
          </button>
        )}
      </div>

      {/* Module Navigation Tabs — Only Authorized Modules by Tenant Plan */}
      <nav
        aria-label="Navegación de módulos públicos del tenant"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-zinc-900"
      >
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none" role="tablist">
          {authorizedModules.map((moduleKey) => {
            const def = MODULE_DEFINITIONS[moduleKey];
            if (!def) return null;
            const Icon = def.icon;
            const isActive = activeModule === moduleKey;

            return (
              <button
                key={moduleKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectModule(moduleKey)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: isActive ? accent : undefined }}
                />
                <span className="hidden sm:inline">{def.label}</span>
                <span className="sm:hidden">{def.shortLabel}</span>
                {isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
