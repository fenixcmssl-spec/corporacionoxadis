import React from 'react';
import Link from 'next/link';
import { Flame, ShieldCheck, Database, Globe, Layers, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna Marca */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white font-bold">
                <Flame className="h-4 w-4" />
              </div>
              <span className="text-base font-black tracking-wider text-white">
                FENIX<span className="text-red-500">CMS</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Motor SaaS profesional para gestión multitenant, multidominio y multilingüe con tienda de comercio electrónico integrada sobre PostgreSQL.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <Database className="h-3.5 w-3.5 text-red-500" />
              <span>PostgreSQL + Prisma Architecture</span>
            </div>
          </div>

          {/* Zonas de la Plataforma */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-red-500" />
              Zonas Funcionales
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/superadmin" className="hover:text-red-400 transition">
                  /superadmin — Consola Global
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-red-400 transition">
                  /login — Portal de Acceso Seguro
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-red-400 transition">
                  /admin — CMS del Tenant
                </Link>
              </li>
              <li>
                <Link href="/tienda" className="hover:text-red-400 transition">
                  /tienda — Escaparate E-commerce
                </Link>
              </li>
            </ul>
          </div>

          {/* Comercio y Planes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-red-500" />
              Comercialización SaaS
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/planes" className="hover:text-red-400 transition">
                  Catálogo de Planes & Licencias
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-red-400 transition">
                  Proceso de Contratación
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Aislamiento Multitenant Estricto</span>
              </li>
              <li>
                <span className="text-zinc-500">Multidominio con SSL Automático</span>
              </li>
            </ul>
          </div>

          {/* Seguridad y Estado Técnico */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
              Garantías de Seguridad
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Hashing Bcrypt para credenciales</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Validación de esquemas en servidor</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Verificación estricta de pagos</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>Sin barra de búsqueda en interfaz</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500">
          <p>© 2026 FenixCMS SaaS Platform. Todos los derechos reservados. Fase 1.0 Arquitectura Base.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono text-[10px]">
            <span>NODE_ENV: production</span>
            <span>TENANT_ISOLATION: STRICT</span>
            <span>DB_ENGINE: POSTGRESQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
