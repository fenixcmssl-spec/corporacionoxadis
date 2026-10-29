'use client';

import React from 'react';
import Image from 'next/image';
import { X, Trash2, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CartItemDto } from '../../lib/types/fenix';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemDto[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (customer: { name: string; email: string; simulateVerifiedPayment: boolean }) => Promise<{
    orderNumber: string;
    status: string;
  }>;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [simulateVerified, setSimulateVerified] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [orderResult, setOrderResult] = React.useState<{ orderNumber: string; status: string } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setFormError('Por favor completa el nombre y correo para el pedido.');
      return;
    }

    if (!customerEmail.includes('@')) {
      setFormError('Introduce una dirección de correo válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCheckout({
        name: customerName,
        email: customerEmail,
        simulateVerifiedPayment: simulateVerified,
      });
      setOrderResult(res);
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col justify-between border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Cesta de Compra</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {orderResult ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-bold text-white">¡Pedido Registrado con Éxito!</h3>
              <p className="text-xs text-zinc-400">
                Identificador oficial: <span className="font-mono text-red-400 font-bold">{orderResult.orderNumber}</span>
              </p>
              <div
                className={`rounded-lg p-3 text-xs border ${
                  orderResult.status === 'PAID'
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                }`}
              >
                <strong>Estado del Pago: {orderResult.status}</strong>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {orderResult.status === 'PAID'
                    ? 'Verificación criptográfica válida confirmada.'
                    : 'Regla de seguridad activa: El pedido no se marca como pagado sin verificación bancaria externa.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderResult(null);
                  onClose();
                }}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
              >
                Volver a la tienda
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 space-y-2">
              <p className="text-sm">La cesta está vacía</p>
              <p className="text-xs text-zinc-600">Explora el catálogo y añade productos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded bg-zinc-800 flex-shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <p className="text-xs font-mono text-red-400 mt-0.5">{item.price.toFixed(2)} €</p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                        className="h-5 w-5 rounded bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
                        aria-label="Disminuir cantidad"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="h-5 w-5 rounded bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.productId)}
                    className="p-1 text-zinc-500 hover:text-red-500 transition"
                    aria-label={`Eliminar ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Checkout Form */}
              <form onSubmit={handleSubmitOrder} className="mt-6 border-t border-zinc-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Datos de Facturación del Cliente
                </h4>

                {formError && (
                  <div className="rounded border border-red-800/80 bg-red-950/50 p-2 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="customer-name" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej. María Sánchez"
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="customer-email" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@ejemplo.es"
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Switch para prueba de verificación de pago seguro */}
                <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateVerified}
                      onChange={(e) => setSimulateVerified(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700 text-red-600 focus:ring-red-500"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Verificación Criptográfica Bancaria</span>
                      <p className="text-zinc-500 text-[10px]">
                        Si no se marca, el pedido queda en estado PENDING según la regla 5 de seguridad.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:bg-red-500 transition active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isSubmitting ? 'Verificando y Creando...' : `Confirmar Pedido — ${total.toFixed(2)} €`}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Subtotal */}
        {!orderResult && items.length > 0 && (
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white text-sm font-bold">{total.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
              <span>Impuestos incluidos (IVA 21%)</span>
              <span>Envío asegurado FenixCMS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
