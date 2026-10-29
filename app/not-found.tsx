import React from 'react';
import Link from 'next/link';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-6">
            <FileQuestion className="h-7 w-7 text-red-500" />
          </div>

          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            Error 404 &bull; Recurso Inexistente
          </span>

          <h1 className="mt-3 text-2xl font-black text-white">
            Página No Encontrada
          </h1>

          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            La ruta o el espacio de tenant solicitado no está disponible o no existe en la plataforma FenixCMS SaaS.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95"
            >
              <Home className="h-4 w-4" />
              <span>Volver a la Plataforma</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
