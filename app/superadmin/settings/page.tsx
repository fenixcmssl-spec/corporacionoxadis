'use client';

import React from 'react';
import { Sliders, Database, ShieldCheck, Lock, CheckCircle2, KeyRound, AlertTriangle } from 'lucide-react';
import { superAdminService } from '../../../lib/services/superadmin.service';
import { fenixDb } from '../../../lib/db/client';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = React.useState(() => superAdminService.getSettings());
  const dbStatus = fenixDb.getPersistenceStatus();
  const [saved, setSaved] = React.useState(false);

  // Estados de cambio de contraseña
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [revokeOthers, setRevokeOthers] = React.useState(true);
  const [pwdLoading, setPwdLoading] = React.useState(false);
  const [pwdSuccess, setPwdSuccess] = React.useState<string | null>(null);
  const [pwdError, setPwdError] = React.useState<string | null>(null);

  const handleToggle = (key: keyof typeof settings) => {
    const updated = superAdminService.updateSettings({
      [key]: !settings[key],
    });
    setSettings({ ...updated });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwdError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 10) {
      setPwdError('La nueva contraseña debe tener un mínimo de 10 caracteres.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_root_01',
          currentPassword,
          newPassword,
          revokeOtherSessions: revokeOthers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwdError(data.error || 'No se pudo actualizar la contraseña.');
      } else {
        setPwdSuccess(
          `Contraseña actualizada con éxito.${
            data.revokedSessionsCount ? ` Se revocaron ${data.revokedSessionsCount} sesiones activas anteriores.` : ''
          }`
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwdError('Error al comunicar con el servicio de autenticación.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Sliders className="h-4 w-4" />
            <span>Parámetros Operativos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Configuración de Sistema
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de persistencia PostgreSQL, directivas de seguridad y políticas de plataforma
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950 border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Configuración Guardada</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Persistence Status */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-white">
            <Database className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Diagnóstico de Base de Datos
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">MOTOR RELACIONAL:</span>
              <span className="text-white font-bold">{dbStatus.engine}</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">ESTADO DE CONEXIÓN:</span>
              <span className="text-red-400 font-bold">{dbStatus.mode}</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">ESQUEMA PRISMA:</span>
              <span className="text-zinc-200">{dbStatus.schemaPath}</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1">
              {dbStatus.note}
            </p>
          </div>
        </div>

        {/* Policies Toggles */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
          <div className="flex items-center gap-2.5 text-white">
            <ShieldCheck className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Directivas Operativas de Plataforma
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
              <div>
                <div className="font-bold text-white">Verificación Criptográfica Estricta de Pagos</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Obliga a registrar token criptográfico bancario antes de completar pedidos.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enforceVerifiedPayments}
                onChange={() => handleToggle('enforceVerifiedPayments')}
                className="rounded border-zinc-700 text-red-600 focus:ring-red-500 h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
              <div>
                <div className="font-bold text-white">Aprovisionamiento Automático SSL</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Generación de certificados TLS para nuevos dominios enlazados a tenants.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sslAutoProvisioning}
                onChange={() => handleToggle('sslAutoProvisioning')}
                className="rounded border-zinc-700 text-red-600 focus:ring-red-500 h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
              <div>
                <div className="font-bold text-white">Registro Público de Nuevos Tenants Abierto</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Permite contrataciones y altas directas a través de la ruta /checkout.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.registrationOpen}
                onChange={() => handleToggle('registrationOpen')}
                className="rounded border-zinc-700 text-red-600 focus:ring-red-500 h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
              <div>
                <div className="font-bold text-white">Modo Mantenimiento Global</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Suspende accesos no root para tareas de migración de base de datos.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={() => handleToggle('maintenanceMode')}
                className="rounded border-zinc-700 text-red-600 focus:ring-red-500 h-4 w-4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Seguridad y Cambio de Contraseña de Operador Root */}
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-2.5 text-white mb-4">
          <KeyRound className="h-5 w-5 text-red-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Credenciales de Acceso Root &bull; Cambio de Contraseña
          </h2>
        </div>

        <p className="text-xs text-zinc-400 mb-6 max-w-2xl">
          Actualización de la clave cifrada con Bcrypt (12 rondas de salt). Exige verificar la contraseña actual
          e invalida de forma inmediata todas las demás sesiones persistentes activas.
        </p>

        {pwdSuccess && (
          <div className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/60 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        {pwdError && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950/60 p-3.5 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contraseña Actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Contraseña actual"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nueva Contraseña (mín. 10 car.)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva clave robusta"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetir nueva clave"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
                className="rounded border-zinc-700 text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span>Revocar todas las demás sesiones activas de este usuario (recomendado)</span>
            </label>

            <button
              type="submit"
              disabled={pwdLoading}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
            >
              {pwdLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
