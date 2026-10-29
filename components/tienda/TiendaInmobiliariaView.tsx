'use client';

import React from 'react';
import Image from 'next/image';
import {
  Building2,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Send,
} from 'lucide-react';
import { RealEstatePropertyDto } from '../../lib/types/fenix';
import ItemDetailModal from './ItemDetailModal';

interface TiendaInmobiliariaViewProps {
  tenantName: string;
  properties: RealEstatePropertyDto[];
  accentColor?: string;
}

export default function TiendaInmobiliariaView({
  tenantName,
  properties,
  accentColor = '#2563eb',
}: TiendaInmobiliariaViewProps) {
  const [operationFilter, setOperationFilter] = React.useState<'TODOS' | 'VENTA' | 'ALQUILER'>('TODOS');
  const [selectedProperty, setSelectedProperty] = React.useState<RealEstatePropertyDto | null>(null);

  // Solicitud de visita state
  const [visitName, setVisitName] = React.useState('');
  const [visitEmail, setVisitEmail] = React.useState('');
  const [visitDate, setVisitDate] = React.useState('');
  const [visitSent, setVisitSent] = React.useState(false);

  const filteredProperties =
    operationFilter === 'TODOS'
      ? properties
      : properties.filter((p) => p.operation === operationFilter);

  const handleSendVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitName || !visitEmail) return;
    setVisitSent(true);
    setTimeout(() => {
      setVisitSent(false);
      setVisitName('');
      setVisitEmail('');
      setVisitDate('');
      setSelectedProperty(null);
    }, 2500);
  };

  return (
    <section aria-labelledby="inmobiliaria-heading" className="space-y-8">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <Building2 className="h-4 w-4" style={{ color: accentColor }} />
            <span>Módulo Inmobiliario Oficial</span>
          </div>
          <h2 id="inmobiliaria-heading" className="mt-1 text-2xl font-black text-white">
            Cartera de Inmuebles &amp; Propiedades de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Inmuebles residenciales, corporativos y de alta gama gestionados en exclusiva.
          </p>
        </div>

        {/* Operation Filter Buttons */}
        <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => setOperationFilter('TODOS')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              operationFilter === 'TODOS'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos ({properties.length})
          </button>
          <button
            type="button"
            onClick={() => setOperationFilter('VENTA')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              operationFilter === 'VENTA'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            En Venta
          </button>
          <button
            type="button"
            onClick={() => setOperationFilter('ALQUILER')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              operationFilter === 'ALQUILER'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            En Alquiler
          </button>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <Building2 className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay inmuebles disponibles</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Actualmente no hay propiedades publicadas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => (
            <article
              key={prop.id}
              onClick={() => setSelectedProperty(prop)}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-all duration-300 hover:border-blue-500/60 hover:bg-zinc-900 cursor-pointer shadow-xl"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 mb-4">
                  <Image
                    src={prop.imageUrl || 'https://picsum.photos/seed/property/800/600'}
                    alt={prop.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded bg-blue-600 px-2.5 py-0.5 text-[11px] font-black uppercase text-white shadow-md">
                    {prop.operation}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 rounded bg-black/80 backdrop-blur-sm border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-200">
                    {prop.propertyType}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5 font-mono">
                  <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                  <span className="truncate">{prop.location}, {prop.city}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                  {prop.title}
                </h3>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {prop.description}
                </p>

                {/* Specs Pill Bar */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-zinc-800/80 py-2.5 text-center text-xs text-zinc-300 font-mono">
                  <div className="flex items-center justify-center gap-1">
                    <Maximize2 className="h-3 w-3 text-blue-400" />
                    <span>{prop.surfaceM2} m²</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 border-x border-zinc-800">
                    <Bed className="h-3 w-3 text-blue-400" />
                    <span>{prop.bedrooms} hab</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Bath className="h-3 w-3 text-blue-400" />
                    <span>{prop.bathrooms} baños</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 block">Precio {prop.operation === 'ALQUILER' ? 'mensual' : ''}</span>
                  <span className="text-lg font-black text-white font-mono">
                    {prop.price.toLocaleString('es-ES')} €{prop.operation === 'ALQUILER' ? '/mes' : ''}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Ver Ficha</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
        <ItemDetailModal
          isOpen={Boolean(selectedProperty)}
          onClose={() => {
            setSelectedProperty(null);
            setVisitSent(false);
          }}
          title={selectedProperty.title}
          badge={`${selectedProperty.operation} &bull; ${selectedProperty.propertyType}`}
          badgeColor="#2563eb"
          tenantName={tenantName}
        >
          <div className="space-y-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedProperty.imageUrl}
                alt={selectedProperty.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-3 right-3 rounded-xl bg-black/90 backdrop-blur-md border border-zinc-700 px-4 py-2 text-right">
                <span className="text-[10px] text-zinc-400 block font-mono">PRECIO OFICIAL</span>
                <span className="text-xl font-black text-blue-400 font-mono">
                  {selectedProperty.price.toLocaleString('es-ES')} €
                  {selectedProperty.operation === 'ALQUILER' ? '/mes' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span>{selectedProperty.location}, {selectedProperty.city}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-center font-mono text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">SUPERFICIE</span>
                <strong className="text-white text-sm">{selectedProperty.surfaceM2} m²</strong>
              </div>
              <div className="border-x border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">HABITACIONES</span>
                <strong className="text-white text-sm">{selectedProperty.bedrooms}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">BAÑOS</span>
                <strong className="text-white text-sm">{selectedProperty.bathrooms}</strong>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Descripción Completa</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedProperty.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Equipamiento &amp; Calidades</h4>
              <div className="flex flex-wrap gap-2">
                {selectedProperty.features.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>{f}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Visit Request Form */}
            <div className="p-4 rounded-xl border border-blue-950 bg-blue-950/20 space-y-3">
              <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Solicitar Cita de Visita o Información</span>
              </h4>

              {visitSent ? (
                <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Solicitud enviada al equipo del tenant! Se pondrán en contacto contigo en breve.</span>
                </div>
              ) : (
                <form onSubmit={handleSendVisit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre completo"
                    value={visitName}
                    onChange={(e) => setVisitName(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Correo de contacto"
                    value={visitEmail}
                    onChange={(e) => setVisitEmail(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar Solicitud</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
