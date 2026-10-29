'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import {
  Flame,
  ShieldCheck,
  Globe2,
  Store,
  Layers,
  Database,
  Puzzle,
  Palette,
  ArrowRight,
  CheckCircle,
  KeyRound,
  Server,
  Lock,
} from 'lucide-react';
import { fenixDb } from '../lib/db/client';

export default function HomePage() {
  const plans = fenixDb.getPlans();
  const dbStatus = fenixDb.getPersistenceStatus();

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 py-20 lg:py-28">
          {/* Subtle Red Ambient Glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-red-600/15 blur-3xl" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-3.5 py-1 text-xs font-semibold text-red-300 mb-6">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              <span>FenixCMS SaaS — Fase 1.0 Arquitectura Inicial</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
              El CMS SaaS Multi-Tenant &amp; Tienda Online más{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-400">
                Poderoso y Fácil de Usar
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Diseñado con arquitectura TypeScript, Next.js y PostgreSQL con Prisma. Soporta multidominio,
              multiidioma en tiempo real, catálogo de e-commerce y motor modular de plugins y temas tipo WordPress con aislamiento estricto.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/planes"
                className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-red-950/50 hover:bg-red-500 transition active:scale-95 border border-red-500"
              >
                <span>Explorar Planes &amp; Licencias</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tienda"
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition"
              >
                <Store className="h-4 w-4 text-red-500" />
                <span>Ver Tienda de Ejemplo</span>
              </Link>
            </div>

            {/* Security Guarantee Pill */}
            <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 border-t border-zinc-800/80 pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-red-500" />
                <span>PostgreSQL + Prisma</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-500" />
                <span>Bcrypt Hash &amp; Zero-Trust Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-red-500" />
                <span>Multidominio &amp; Multiidioma</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-red-500" />
                <span>Sin Barras de Búsqueda</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2 FUNCIONES COMERCIALES CLARAMENTE SEPARADAS */}
        <section className="py-16 border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-xs font-bold uppercase tracking-widest text-red-500">
                Estructura de Negocio
              </h2>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                Dos Funciones Comerciales Claramente Separadas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Función A */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 flex flex-col justify-between hover:border-red-600/50 transition">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/40 text-red-400">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                        Función A
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        La Plataforma Central FenixCMS
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    Comercializa y administra los planes, suscripciones recurrentes y licencias de FenixCMS. 
                    Mantiene el control global de infraestructura, métricas SaaS y aprovisionamiento de tenants.
                  </p>
                  <ul className="space-y-2.5 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Catálogo y facturación de planes de suscripción</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Generación y control criptográfico de licencias</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Consola global exclusiva del superadministrador</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <Link
                    href="/superadmin"
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5"
                  >
                    <span>Ir a /superadmin</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/planes"
                    className="text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Ver Catálogo de Planes
                  </Link>
                </div>
              </div>

              {/* Función B */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 flex flex-col justify-between hover:border-red-600/50 transition">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/40 text-red-400">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                        Función B
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        Los Espacios de los Clientes (Tenants)
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    Utilizan las licencias adquiridas para operar sus propios CMS independientes, vincular sus dominios,
                    instalar plugins, activar temas y gestionar su tienda de e-commerce sin cruce de datos.
                  </p>
                  <ul className="space-y-2.5 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Panel administrativo de CMS propio para cada tenant</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Tienda online con pasarela, catálogo y pedidos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Aislamiento absoluto: ningún cliente accede a datos ajenos</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <Link
                    href="/admin"
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5"
                  >
                    <span>Ir a /admin (CMS Tenant)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/tienda"
                    className="text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Ver Escaparate Público /tienda
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 ZONAS FUNCIONALES OBLIGATORIAS */}
        <section className="py-16 border-b border-zinc-800 bg-black">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-xs font-bold uppercase tracking-widest text-red-500">
                Arquitectura de Rutas
              </h2>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                Las Cuatro Zonas Obligatorias
              </p>
              <p className="mt-2 text-xs text-zinc-400 max-w-xl mx-auto">
                Acceso directo a cada zona funcional con sus respectivas reglas de aislamiento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Zona 1: /superadmin */}
              <Link
                href="/superadmin"
                className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-red-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-red-500 group-hover:bg-red-600 group-hover:text-white transition">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-red-400 font-mono">
                    /superadmin
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Administración global exclusiva del superadministrador. Control de tenants, planes y licencias.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-red-400">
                  <span>Acceder a Consola</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Zona 2: /login */}
              <Link
                href="/login"
                className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-red-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-red-500 group-hover:bg-red-600 group-hover:text-white transition">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-red-400 font-mono">
                    /login
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Entrada al portal de clientes SaaS. Gestión de credenciales seguras con hashing y acceso a suscripción.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-red-400">
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Zona 3: /admin */}
              <Link
                href="/admin"
                className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-red-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-red-500 group-hover:bg-red-600 group-hover:text-white transition">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-red-400 font-mono">
                    /admin
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Administración del CMS del tenant. Páginas, catálogo, plugins, temas, dominios y multiidioma.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-red-400">
                  <span>Panel del Tenant</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Zona 4: /tienda */}
              <Link
                href="/tienda"
                className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-red-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-red-500 group-hover:bg-red-600 group-hover:text-white transition">
                    <Store className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-red-400 font-mono">
                    /tienda
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Escaparate público del tenant. E-commerce completo con categorías, carrito y multiidioma sin barra de búsqueda.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-red-400">
                  <span>Ver Tienda</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* STATUS Y TRANSPARENCIA TÉCNICA */}
        <section className="py-12 bg-zinc-950 border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-red-500" />
                    <h3 className="text-base font-bold text-white">
                      Estado de Persistencia &amp; Base de Datos
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
                    {dbStatus.note}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {dbStatus.mode}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 mt-1">
                    Esquema: {dbStatus.schemaPath}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
