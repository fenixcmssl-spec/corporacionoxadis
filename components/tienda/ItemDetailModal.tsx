'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  badgeColor?: string;
  tenantName: string;
  children: React.ReactNode;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  title,
  badge,
  badgeColor = '#dc2626',
  tenantName,
  children,
}: ItemDetailModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-zinc-100 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                {tenantName}
              </span>
              {badge && (
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${badgeColor}20`,
                    color: badgeColor,
                    borderColor: `${badgeColor}50`,
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <h2 id="modal-title" className="text-xl sm:text-2xl font-black text-white">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Cerrar ficha"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>

        {/* Footer Isolation Guarantee */}
        <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Contenido verificado y publicado
          </span>
          <span>Tenant ID validado</span>
        </div>
      </div>
    </div>
  );
}
