'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import {
  KeyRound,
  ShieldCheck,
  Building,
  ArrowRight,
  AlertCircle,
  Flame,
  Lock,
  UserCheck,
} from 'lucide-react';
import { fenixDb } from '../../lib/db/client';

export default function LoginPage() {
  const router = useRouter();

  const [portalType, setPortalType] = React.useState<'TENANT' | 'SUPERADMIN'>('TENANT');
  const [selectedTenantId, setSelectedTenantId] = React.useState('tenant_moda_01');
  const [email, setEmail] = React.useState('admin@modaurbana.es');
  const [password, setPassword] = React.useState('FenixSecure2026!');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const tenants = fenixDb.getTenants();

  const handlePortalSwitch = (type: 'TENANT' | 'SUPERADMIN') => {
    setPortalType(type);
    setErrorMessage(null);
    if (type === 'SUPERADMIN') {
      setEmail('superadmin@fenixcms.io');
      setPassword('MasterFenixSaas2026!');
    } else {
      setEmail('admin@modaurbana.es');
      setPassword('FenixSecure2026!');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = portalType === 'SUPERADMIN' ? '/api/auth/superadmin-login' : '/api/auth/tenant-login';
      const payload =
        portalType === 'SUPERADMIN'
          ? { email, password }
          : { email, password, requestedTenantId: selectedTenantId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Credenciales de acceso no válidas o cuenta no autorizada.');
      } else {
        if (portalType === 'SUPERADMIN') {
          router.push('/superadmin');
        } else {
          router.push(`/admin?tenant=${selectedTenantId}`);
        }
      }
    } catch (err: any) {
      setErrorMessage('Error de comunicación con el servicio de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Card Frame */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-white tracking-tight">
                Portal de Acceso FenixCMS
              </h1>
              <p className="mt-1 text-xs text-zinc-400">
                Identifícate para administrar tu CMS o acceder a la plataforma SaaS
              </p>
            </div>

            {/* Portal Type Toggle */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
              <button
                type="button"
                onClick={() => handlePortalSwitch('TENANT')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  portalType === 'TENANT'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>Cliente Tenant</span>
              </button>
              <button
                type="button"
                onClick={() => handlePortalSwitch('SUPERADMIN')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  portalType === 'SUPERADMIN'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>SuperAdmin</span>
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-800/80 bg-red-950/50 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              {portalType === 'TENANT' && (
                <div>
                  <label htmlFor="tenant-select" className="block text-xs font-medium text-zinc-400 mb-1">
                    Seleccionar Espacio de Tenant
                  </label>
                  <select
                    id="tenant-select"
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.customDomain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-zinc-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-xs font-medium text-zinc-400">
                    Contraseña
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Bcrypt Salted</span>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
              >
                <span>{isLoading ? 'Verificando Hash...' : 'Entrar al Panel'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Quick Demo Shortcuts */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 space-y-2">
              <span className="block font-semibold text-zinc-400">Accesos directos de demostración:</span>
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    handlePortalSwitch('TENANT');
                    router.push('/admin');
                  }}
                  className="text-left text-zinc-400 hover:text-red-400 transition"
                >
                  &bull; Acceder directamente a <strong className="text-zinc-200">/admin</strong> (CMS Tenant)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePortalSwitch('SUPERADMIN');
                    router.push('/superadmin');
                  }}
                  className="text-left text-zinc-400 hover:text-red-400 transition"
                >
                  &bull; Acceder directamente a <strong className="text-zinc-200">/superadmin</strong> (Consola Global)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
