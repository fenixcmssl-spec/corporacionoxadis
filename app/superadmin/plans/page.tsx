'use client';

import React from 'react';
import Link from 'next/link';
import { Tag, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { fenixDb } from '../../../lib/db/client';
import { formatNumber } from '../../../lib/utils/format';

export default function SuperAdminPlansPage() {
  const plans = fenixDb.getPlans();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full">
      <div className="pb-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-red-500 uppercase tracking-widest mb-1">
            <Tag className="h-4 w-4" />
            <span>Monetización &amp; Licenciamiento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Planes de Suscripción FenixCMS
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Estructura de precios, capacidades técnicas y límites de uso por tenant
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider">
                  {p.slug}
                </span>
                {p.isFeatured && (
                  <span className="rounded bg-red-950 border border-red-800 text-red-400 text-[10px] font-bold px-2 py-0.5">
                    Destacado
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">{p.name}</h3>
              <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">{p.description}</p>

              <div className="mt-4 pt-4 border-t border-zinc-800/80">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{p.priceMonthly} €</span>
                  <span className="text-xs text-zinc-500">/ mes</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Anual: {p.priceYearly} €/año
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs border-y border-zinc-800/80 py-3 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Máx. Dominios:</span>
                  <span className="font-semibold text-white">{p.maxDomains}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Máx. Productos:</span>
                  <span className="font-semibold text-white">{formatNumber(p.maxProducts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Almacenamiento:</span>
                  <span className="font-semibold text-white">{p.maxStorageMb / 1000} GB</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-zinc-400">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <span className="block text-center text-[10px] font-mono text-zinc-500">
                Modelo PostgreSQL: subscription_plans
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
