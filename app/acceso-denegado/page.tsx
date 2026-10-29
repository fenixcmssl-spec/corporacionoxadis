'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { ShieldAlert, ArrowLeft, KeyRound, Home } from 'lucide-react';

function AccesoDenegadoContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('motivo') || 'Acceso restringido por política de aislamiento de tenant.';

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-zinc-950 p-8 text-center shadow-2xl shadow-red-950/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded">
            Error 403 &bull; Acceso Denegado
          </span>

          <h1 className="mt-3 text-2xl font-black text-white">
            Operación No Autorizada
          </h1>

          <p className="mt-3 text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
            {reason}
          </p>

          <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left text-xs font-mono text-zinc-400 space-y-1">
            <div className="text-zinc-500 text-[10px]">DIRECTIVA DE SEGURIDAD FENIXCMS:</div>
            <div>&bull; Principio de aislamiento estricto de datos por Tenant ID</div>
            <div>&bull; Bloqueo de cruce de sesiones entre tiendas</div>
            <div>&bull; Validación en capa de servidor sin exposición de secretos</div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95"
            >
              <KeyRound className="h-4 w-4" />
              <span>Autenticarse con Cuenta Válida</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 border border-zinc-800 transition"
            >
              <Home className="h-4 w-4" />
              <span>Volver al Inicio</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AccesoDenegadoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AccesoDenegadoContent />
    </Suspense>
  );
}
