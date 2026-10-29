'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, KeyRound, ArrowRight, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { superadminLoginSchema } from '../../../lib/validations';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('superadmin@fenixcms.io');
  const [password, setPassword] = React.useState('MasterFenixSaas2026!');
  const [securityToken, setSecurityToken] = React.useState('FNX-ROOT-991');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = superadminLoginSchema.safeParse({ email, password, securityToken });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Datos de acceso inválidos.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/superadmin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, securityToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Credenciales de acceso no válidas o cuenta no autorizada.');
      } else {
        router.push('/superadmin');
      }
    } catch (err: any) {
      setErrorMessage('Error de comunicación con el servicio de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between p-6">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al portal público</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-500">CANAL RAÍZ SEGURO TLS 1.3</span>
      </div>

      <div className="w-full max-w-md mx-auto my-auto">
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-8 shadow-2xl shadow-red-950/40">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 mb-4 shadow-lg shadow-red-950/50">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="inline-block rounded bg-red-950/80 border border-red-800 px-2 py-0.5 text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest mb-2">
              Autenticación Root
            </div>
            <h1 className="text-2xl font-black text-white">Consola SuperAdmin</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Acceso restringido para operadores y dirección de FenixCMS SaaS
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-800 bg-red-950/70 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Correo de Administrador Global
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Contraseña Cifrada
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Token de Autorización de Infraestructura
              </label>
              <input
                type="text"
                value={securityToken}
                onChange={(e) => setSecurityToken(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white font-mono focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-xl shadow-red-950/60 hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{isLoading ? 'Verificando Privilegios...' : 'Acceder a la Consola Global'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="text-center text-[11px] text-zinc-600 font-mono">
        FenixCMS SaaS Platform &bull; Protocolo de Acceso Segregado Fase 1.1
      </div>
    </div>
  );
}
