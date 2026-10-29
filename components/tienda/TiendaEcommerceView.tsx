'use client';

import React from 'react';
import Image from 'next/image';
import { Truck, ShieldCheck, RotateCcw, Award, ShoppingBag, Check, ArrowRight } from 'lucide-react';
import { ProductDto } from '../../lib/types/fenix';
import ProductCard from './ProductCard';
import ItemDetailModal from './ItemDetailModal';

interface TiendaEcommerceViewProps {
  tenantName: string;
  products: ProductDto[];
  onAddToCart: (product: ProductDto) => void;
  accentColor?: string;
}

export default function TiendaEcommerceView({
  tenantName,
  products,
  onAddToCart,
  accentColor = '#dc2626',
}: TiendaEcommerceViewProps) {
  const [selectedCategory, setSelectedCategory] = React.useState('Todos los Artículos');
  const [selectedProduct, setSelectedProduct] = React.useState<ProductDto | null>(null);
  const [modalAdded, setModalAdded] = React.useState(false);

  const categories = React.useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.categoryName)));
    return ['Todos los Artículos', ...unique];
  }, [products]);

  const filteredProducts =
    selectedCategory === 'Todos los Artículos'
      ? products
      : products.filter((p) => p.categoryName === selectedCategory);

  const handleModalAdd = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct);
    setModalAdded(true);
    setTimeout(() => setModalAdded(false), 1500);
  };

  return (
    <section aria-labelledby="ecommerce-heading" className="space-y-8">
      {/* Category Pills Navigation - No Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <ShoppingBag className="h-4 w-4" style={{ color: accentColor }} />
            <span>Módulo de Tienda Online &amp; Catálogo</span>
          </div>
          <h2 id="ecommerce-heading" className="mt-1 text-2xl font-black text-white">
            Catálogo Oficial de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Productos con stock garantizado, envío urgente y pasarela de pago protegida.
          </p>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-zinc-100 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trust Guarantees */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 flex items-center gap-3">
          <Truck className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-white">Envío Rápido 24/48h</h4>
            <p className="text-[10px] text-zinc-500">Envíos asegurados y trazables</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-white">Pago 100% Protegido</h4>
            <p className="text-[10px] text-zinc-500">Validación criptográfica segura</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-white">Devolución 30 Días</h4>
            <p className="text-[10px] text-zinc-500">Garantía sin complicaciones</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 flex items-center gap-3">
          <Award className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-white">Garantía Oficial</h4>
            <p className="text-[10px] text-zinc-500">Fabricación y acabados de calidad</p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <ShoppingBag className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay productos disponibles</h3>
          <p className="text-xs text-zinc-500 mt-1">
            No se han encontrado artículos publicados en la categoría &quot;{selectedCategory}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCategory('Todos los Artículos')}
            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
          >
            Ver todos los productos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onSelectProduct={setSelectedProduct}
            />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ItemDetailModal
          isOpen={Boolean(selectedProduct)}
          onClose={() => {
            setSelectedProduct(null);
            setModalAdded(false);
          }}
          title={selectedProduct.title}
          badge={selectedProduct.categoryName}
          badgeColor={accentColor}
          tenantName={tenantName}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedProduct.imageUrl}
                alt={selectedProduct.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-zinc-800">
                  <span>SKU: <strong className="text-white">{selectedProduct.sku}</strong></span>
                  <span>Stock: <strong className="text-emerald-400">{selectedProduct.stock} unidades</strong></span>
                </div>

                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-3xl font-black text-white font-mono">
                    {selectedProduct.price.toFixed(2)} €
                  </span>
                  {selectedProduct.comparePrice && (
                    <span className="text-sm text-zinc-500 line-through font-mono">
                      {selectedProduct.comparePrice.toFixed(2)} €
                    </span>
                  )}
                </div>

                <div className="mt-4 text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {selectedProduct.description}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleModalAdd}
                  disabled={selectedProduct.stock <= 0}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition active:scale-95 ${
                    modalAdded
                      ? 'bg-emerald-600 text-white'
                      : selectedProduct.stock > 0
                      ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/60'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {modalAdded ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>¡Añadido a la Cesta de Compra!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>Añadir al Carrito ({selectedProduct.price.toFixed(2)} €)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
