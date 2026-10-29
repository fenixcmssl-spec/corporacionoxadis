'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { Check, Flame, Shield, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { fenixDb } from '../../lib/db/client';
import { formatNumber } from '../../lib/utils/format';

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = React.useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const plans = fenixDb.getPlans();

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-300 mb-4">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              <span>Plataforma Central FenixCMS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Planes &amp; Licencias FenixCMS SaaS
            </h1>
            <p className="mt-4 text-sm sm:text-base text-zinc-400">
              Escoge el plan perfecto para tu proyecto. Incluye CMS multiidioma, soporte multidominio,
              motor de plugins y tienda online lista para facturar.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="mt-8 inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1.5 shadow-md">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  billingCycle === 'YEARLY'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                  2 Meses Gratis
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
              const totalYearly = plan.priceYearly;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-8 transition-all duration-300 ${
                    plan.isFeatured
                      ? 'border-red-600 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 shadow-2xl shadow-red-950/40 ring-1 ring-red-500/50'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  {plan.isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg">
                      Más Popular
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-2 text-xs text-zinc-400 min-h-[36px]">{plan.description}</p>

                    {/* Price */}
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white">{price} €</span>
                      <span className="text-xs text-zinc-400">/ mes</span>
                    </div>
                    {billingCycle === 'YEARLY' && (
                      <p className="mt-1 text-[11px] font-mono text-zinc-500">
                        Facturado anualmente a {totalYearly} €/año
                      </p>
                    )}

                    {/* Limits Specs */}
                    <div className="mt-6 space-y-2 border-y border-zinc-800/80 py-4 text-xs">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Dominios:</span>
                        <span className="font-semibold text-white">{plan.maxDomains}</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Productos Tienda:</span>
                        <span className="font-semibold text-white">Hasta {formatNumber(plan.maxProducts)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Almacenamiento:</span>
                        <span className="font-semibold text-white">{plan.maxStorageMb / 1000} GB</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link
                      href={`/checkout?plan=${plan.slug}&cycle=${billingCycle}`}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition active:scale-95 ${
                        plan.isFeatured
                          ? 'bg-red-600 text-white shadow-lg shadow-red-950/50 hover:bg-red-500 border border-red-500'
                          : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                      }`}
                    >
                      <span>Contratar Licencia</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Footer */}
          <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-xs text-zinc-400">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Shield className="h-4 w-4 text-red-500" />
                Garantía de Devolución de 14 días
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Zap className="h-4 w-4 text-red-500" />
                Despliegue Inmediato de Tenant
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Sparkles className="h-4 w-4 text-red-500" />
                Actualizaciones Continuas Incluidas
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
