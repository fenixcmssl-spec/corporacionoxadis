'use client';

import React from 'react';
import Image from 'next/image';
import { ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { ProductDto } from '../../lib/types/fenix';

interface ProductCardProps {
  product: ProductDto;
  onAddToCart: (product: ProductDto) => void;
  onSelectProduct?: (product: ProductDto) => void;
}

export default function ProductCard({ product, onAddToCart, onSelectProduct }: ProductCardProps) {
  const [added, setAdded] = React.useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <article
      onClick={() => onSelectProduct?.(product)}
      className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-all duration-300 hover:border-red-600/60 hover:shadow-xl hover:shadow-red-950/20 cursor-pointer"
    >
      {/* Top Image & Badges */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800/80">
        <Image
          src={product.imageUrl || 'https://picsum.photos/seed/product/600/600'}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Discount Badge */}
        {discount && (
          <div className="absolute top-2.5 left-2.5 rounded bg-red-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
            -{discount}%
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute bottom-2.5 right-2.5 rounded bg-zinc-950/80 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-300 backdrop-blur-sm border border-zinc-700">
          Stock: {product.stock}
        </div>
      </div>

      {/* Info Content */}
      <div className="mt-3.5 flex flex-col flex-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span>{product.categoryName}</span>
          <span>{product.sku}</span>
        </div>

        <h3 className="mt-1 text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
          {product.title}
        </h3>

        <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price and CTA */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white">{product.price.toFixed(2)} €</span>
            {product.comparePrice && (
              <span className="text-xs text-zinc-500 line-through">
                {product.comparePrice.toFixed(2)} €
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 ${
              added
                ? 'bg-emerald-600 text-white'
                : product.stock > 0
                ? 'bg-zinc-800 text-zinc-100 hover:bg-red-600 hover:text-white border border-zinc-700 hover:border-red-500'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
            aria-label={`Añadir ${product.title} al carrito`}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Añadido</span>
              </>
            ) : product.stock > 0 ? (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Añadir</span>
              </>
            ) : (
              <span>Agotado</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
