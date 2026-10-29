'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, ShieldAlert, Store, LayoutDashboard, KeyRound, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Plataforma' },
    { href: '/planes', label: 'Planes & Precios' },
    { href: '/tienda', label: 'Tienda Tenant' },
    { href: '/admin', label: 'CMS Admin' },
    { href: '/superadmin', label: 'SuperAdmin' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 via-rose-600 to-zinc-900 border border-red-500/30 text-white shadow-lg shadow-red-950/50 group-hover:scale-105 transition-transform">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-wider text-white flex items-center gap-1.5">
              FENIX<span className="text-red-500">CMS</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5 bg-zinc-900">
                SaaS
              </span>
            </span>
            <span className="text-[11px] text-zinc-400 font-mono tracking-tight">Multi-Tenant & Commerce Engine</span>
          </div>
        </Link>

        {/* Navigation Links - Prohibida la barra de búsqueda */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-red-400 font-semibold border border-zinc-700/60'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md border border-zinc-800 transition"
          >
            <KeyRound className="h-3.5 w-3.5 text-red-500" />
            <span>Acceso Portal</span>
          </Link>

          <Link
            href="/planes"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-md shadow-md shadow-red-950/40 border border-red-500/40 transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Contratar Licencia</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
