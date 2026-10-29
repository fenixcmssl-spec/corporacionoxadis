'use client';

import React from 'react';
import Image from 'next/image';
import { Tag, MapPin, Phone, Mail, User, ArrowRight, Calendar } from 'lucide-react';
import { ClassifiedAdDto } from '../../lib/types/fenix';
import { formatDate } from '../../lib/utils/format';
import ItemDetailModal from './ItemDetailModal';

interface TiendaClasificadosViewProps {
  tenantName: string;
  classifieds: ClassifiedAdDto[];
  accentColor?: string;
}

export default function TiendaClasificadosView({
  tenantName,
  classifieds,
  accentColor = '#10b981',
}: TiendaClasificadosViewProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Todas');
  const [selectedAd, setSelectedAd] = React.useState<ClassifiedAdDto | null>(null);

  const categories = React.useMemo(() => {
    const list = Array.from(new Set(classifieds.map((c) => c.category)));
    return ['Todas', ...list];
  }, [classifieds]);

  const filteredAds =
    selectedCategory === 'Todas'
      ? classifieds
      : classifieds.filter((c) => c.category === selectedCategory);

  return (
    <section aria-labelledby="clasificados-heading" className="space-y-8">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <Tag className="h-4 w-4 text-emerald-500" />
            <span>Módulo de Anuncios Clasificados</span>
          </div>
          <h2 id="clasificados-heading" className="mt-1 text-2xl font-black text-white">
            Tablón de Clasificados de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Compraventa entre particulares y profesionales verificados de la comunidad.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ads Grid */}
      {filteredAds.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <Tag className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay anuncios clasificados</h3>
          <p className="text-xs text-zinc-500 mt-1">
            No se han encontrado anuncios publicados en la categoría seleccionada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => (
            <article
              key={ad.id}
              onClick={() => setSelectedAd(ad)}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 hover:border-emerald-600/50 hover:bg-zinc-900 cursor-pointer shadow-lg"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 mb-4">
                  <Image
                    src={ad.imageUrl || 'https://picsum.photos/seed/classified/800/600'}
                    alt={ad.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-mono font-bold uppercase shadow-sm">
                    {ad.category}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2 font-mono">
                  <MapPin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{ad.location}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {ad.title}
                </h3>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {ad.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">PRECIO</span>
                  <span className="text-lg font-black text-white font-mono">
                    {ad.price ? `${ad.price.toLocaleString('es-ES')} €` : 'A consultar'}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Ver Anuncio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Classified Detail Modal */}
      {selectedAd && (
        <ItemDetailModal
          isOpen={Boolean(selectedAd)}
          onClose={() => setSelectedAd(null)}
          title={selectedAd.title}
          badge={selectedAd.category}
          badgeColor="#10b981"
          tenantName={tenantName}
        >
          <div className="space-y-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedAd.imageUrl}
                alt={selectedAd.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-3 right-3 rounded-xl bg-black/90 backdrop-blur-md border border-zinc-700 px-4 py-2 text-right">
                <span className="text-[10px] text-zinc-400 block font-mono">PRECIO</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {selectedAd.price ? `${selectedAd.price.toLocaleString('es-ES')} €` : 'A consultar'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                {selectedAd.location}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                {formatDate(selectedAd.publishedAt)}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Detalles del Anuncio</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedAd.description}</p>
            </div>

            {/* Advertiser Contact Box */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                <span>Datos de Contacto del Anunciante</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">ANUNCIANTE</span>
                  <span className="text-white font-bold">{selectedAd.contactName}</span>
                </div>
                {selectedAd.contactPhone && (
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TELÉFONO</span>
                    <a href={`tel:${selectedAd.contactPhone}`} className="text-emerald-400 font-bold hover:underline">
                      {selectedAd.contactPhone}
                    </a>
                  </div>
                )}
                {selectedAd.contactEmail && (
                  <div>
                    <span className="text-zinc-500 block text-[10px]">CORREO</span>
                    <a href={`mailto:${selectedAd.contactEmail}`} className="text-emerald-400 font-bold hover:underline truncate block">
                      {selectedAd.contactEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
