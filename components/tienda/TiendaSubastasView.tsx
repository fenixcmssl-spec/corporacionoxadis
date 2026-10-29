'use client';

import React from 'react';
import Image from 'next/image';
import { Gavel, Clock, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuctionItemDto } from '../../lib/types/fenix';
import { formatDate } from '../../lib/utils/format';
import ItemDetailModal from './ItemDetailModal';

interface TiendaSubastasViewProps {
  tenantName: string;
  auctions: AuctionItemDto[];
  onPlaceBid?: (auctionId: string, amount: number, bidder: string) => { success: boolean; error?: string };
  accentColor?: string;
}

export default function TiendaSubastasView({
  tenantName,
  auctions,
  onPlaceBid,
  accentColor = '#f59e0b',
}: TiendaSubastasViewProps) {
  const [selectedAuction, setSelectedAuction] = React.useState<AuctionItemDto | null>(null);
  const [bidAmount, setBidAmount] = React.useState<string>('');
  const [bidderName, setBidderName] = React.useState<string>('');
  const [bidError, setBidError] = React.useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = React.useState<string | null>(null);

  const handleOpenAuction = (auc: AuctionItemDto) => {
    setSelectedAuction(auc);
    setBidAmount((auc.currentBid + auc.minBidIncrement).toString());
    setBidError(null);
    setBidSuccess(null);
  };

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuction) return;
    setBidError(null);
    setBidSuccess(null);

    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setBidError('Introduce un importe numérico válido.');
      return;
    }

    if (!bidderName.trim()) {
      setBidError('Introduce tu nombre o alias de pujador.');
      return;
    }

    if (onPlaceBid) {
      const res = onPlaceBid(selectedAuction.id, amount, bidderName.trim());
      if (!res.success) {
        setBidError(res.error || 'Error al registrar la puja.');
      } else {
        setBidSuccess(`¡Puja registrada con éxito por ${amount.toFixed(2)} €!`);
        // Actualizar subasta seleccionada
        setSelectedAuction((prev) =>
          prev
            ? {
                ...prev,
                currentBid: amount,
                bidsCount: prev.bidsCount + 1,
              }
            : null
        );
        setBidAmount((amount + selectedAuction.minBidIncrement).toString());
      }
    }
  };

  return (
    <section aria-labelledby="subastas-heading" className="space-y-8">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <Gavel className="h-4 w-4 text-amber-500" />
            <span>Módulo de Subastas en Vivo</span>
          </div>
          <h2 id="subastas-heading" className="mt-1 text-2xl font-black text-white">
            Subastas Oficiales de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Pujas transparentes en tiempo real para lotes y piezas exclusivas con verificación criptográfica.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span>Subastas en Vivo Activas</span>
        </div>
      </div>

      {/* Auctions Grid */}
      {auctions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <Gavel className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay lotes en subasta actualmente</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Los nuevos lotes programados aparecerán aquí cuando comience el periodo de licitación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auc) => (
            <article
              key={auc.id}
              onClick={() => handleOpenAuction(auc)}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 hover:border-amber-500/60 hover:bg-zinc-900 cursor-pointer shadow-xl"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 mb-4">
                  <Image
                    src={auc.imageUrl || 'https://picsum.photos/seed/auction/800/600'}
                    alt={auc.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded bg-amber-500 text-black px-2.5 py-0.5 text-[11px] font-black uppercase shadow-md flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                    <span>{auc.status === 'ACTIVE' ? 'En Vivo' : auc.status}</span>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 rounded bg-black/85 backdrop-blur-sm border border-zinc-700 px-2.5 py-0.5 text-[11px] font-mono text-amber-400 font-bold">
                    {auc.bidsCount} pujas
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mb-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Cierre: {formatDate(auc.endsAt)}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                  {auc.title}
                </h3>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {auc.description}
                </p>

                {/* Bidding Summary Box */}
                <div className="mt-4 p-3 rounded-lg border border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">PUJA ACTUAL</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {auc.currentBid.toLocaleString('es-ES')} €
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-mono block">SALIDA</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {auc.startingPrice.toLocaleString('es-ES')} €
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Pujar en este Lote</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Auction Bid Modal */}
      {selectedAuction && (
        <ItemDetailModal
          isOpen={Boolean(selectedAuction)}
          onClose={() => setSelectedAuction(null)}
          title={selectedAuction.title}
          badge={`Subasta ${selectedAuction.status}`}
          badgeColor="#f59e0b"
          tenantName={tenantName}
        >
          <div className="space-y-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedAuction.imageUrl}
                alt={selectedAuction.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs text-center">
              <div>
                <span className="text-zinc-500 block text-[10px]">PUJA ACTUAL</span>
                <span className="text-lg font-black text-amber-400">{selectedAuction.currentBid} €</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">PRECIO SALIDA</span>
                <span className="text-white font-bold">{selectedAuction.startingPrice} €</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">INCREMENTO MÍN.</span>
                <span className="text-white font-bold">+{selectedAuction.minBidIncrement} €</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TOTAL PUJAS</span>
                <span className="text-white font-bold">{selectedAuction.bidsCount}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Descripción del Lote</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedAuction.description}</p>
            </div>

            {/* Interactive Bid Form */}
            <div className="p-5 rounded-xl border border-amber-800/40 bg-amber-950/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  <span>Realizar Puja en Directo</span>
                </h4>
                <span className="text-[11px] font-mono text-zinc-400">
                  Mínimo aceptado: <strong className="text-white">{(selectedAuction.currentBid + selectedAuction.minBidIncrement).toFixed(2)} €</strong>
                </span>
              </div>

              {bidError && (
                <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{bidError}</span>
                </div>
              )}

              {bidSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{bidSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBid} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Tu nombre / alias"
                  value={bidderName}
                  onChange={(e) => setBidderName(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <div className="relative">
                  <input
                    type="number"
                    required
                    step={selectedAuction.minBidIncrement}
                    min={selectedAuction.currentBid + selectedAuction.minBidIncrement}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">€</span>
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition shadow"
                >
                  <Gavel className="h-4 w-4" />
                  <span>Confirmar Puja</span>
                </button>
              </form>
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
