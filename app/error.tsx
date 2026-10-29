'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-zinc-950 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 mb-6">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded">
          Tratamiento Controlado de Error
        </span>

        <h1 className="mt-3 text-2xl font-black text-white">
          Incidencia en el Servicio
        </h1>

        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Ha ocurrido una excepción no prevista. Por motivos de seguridad, las trazas de depuración y variables internas no se exponen al cliente.
        </p>

        {error.digest && (
          <div className="mt-4 p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-500">
            Código de seguimiento: {error.digest}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar Operación</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 border border-zinc-800 transition"
          >
            <Home className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
