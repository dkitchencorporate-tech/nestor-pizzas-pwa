import { useState } from 'react';
import SauceModal from './SauceModal';
import AddToCartModal from './AddToCartModal';
import { useI18nStore } from '../store/i18nStore';

interface Product {
  id: number;
  category: string;
  name: string;
  desc: string;
  price: number;
  badge: string;
  img?: string;
  img_url?: string;
}

// Utilidad para resaltar ingredientes en la descripción
const highlightIngredients = (desc: string) => {
  // Ingredientes clave a resaltar (en mayúsculas/minúsculas)
  const keyIngredients = ['mozzarella', 'tomate', 'york', 'queso de cabra', 'cebolla', 'carne kebab', 'salsa kebab', 'piña', 'champiñón', 'atún', 'bacon', 'serrano', 'salami', 'salchichas', 'gambas', 'delicias de mar', 'peperoni', 'ternera', 'salsa picante', 'salsa barbacoa', 'salsa cheddar', 'salsa boloñesa', 'pollo al curry', 'salsa carbonara', 'nata', 'huevo', 'cinco quesos', 'pulled pork', 'salsa BBQ', 'doble cheddar', 'hamburguesa artesana'];
  
  let highlightedDesc = desc;
  
  keyIngredients.forEach(ing => {
    // Expresión regular insensible a mayúsculas
    const regex = new RegExp(`(${ing})`, 'gi');
    highlightedDesc = highlightedDesc.replace(regex, '<span class="text-green-400 font-bold">$1</span>');
  });

  return (
    <p 
      className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed font-medium line-clamp-2"
      dangerouslySetInnerHTML={{ __html: highlightedDesc }}
    ></p>
  );
};

interface ProductCardProps {
  product: Product;
  onCustomize?: (product: Product) => void;
}

export default function ProductCard({ product, onCustomize }: ProductCardProps) {
  const { t, tDynamic } = useI18nStore();
  const [showSauceModal, setShowSauceModal] = useState(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);

  const handleAdd = () => {
    // Si es Pizza Margarita (ID 22) o Mazzi Pizza (ID 23), o Jueves Locos (999), mostrar personalizador
    if ((product.id === 22 || product.id === 23 || product.id === 999) && onCustomize) {
      onCustomize(product);
      return;
    }

    // Si es Patatas Gajos (ID 33), mostrar el selector de salsas
    if (product.id === 33) {
      setShowSauceModal(true);
      return;
    }

    // Levantar Micro-Modal para el resto
    setShowAddToCartModal(true);
  };

  const fallback = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='540' viewBox='0 0 800 540'><rect width='800' height='540' fill='%23111118'/><text x='400' y='250' font-size='28' font-family='sans-serif' font-weight='800' fill='%2316A34A' text-anchor='middle' dominant-baseline='middle'>NESTOR PIZZAS</text><text x='400' y='310' font-size='18' font-family='sans-serif' fill='%23999' text-anchor='middle'>${encodeURIComponent(product.name)}</text></svg>`;

  return (
    <>
      <div className="group relative bg-[#111118] rounded-3xl border-2 border-zinc-800 hover:border-green-500/60 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 flex flex-col">
        {/* Imagen */}
        <div className="relative h-52 sm:h-56 overflow-hidden bg-black shrink-0">
          <img
            src={(product as any).img_url || product.img || fallback}
            alt={product.name}
            className="w-full h-full object-cover opacity-80 mix-blend-lighten group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = fallback; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
          {/* Badge */}
          {product.badge && (
            <span className="absolute top-3 left-3 z-20 bg-black border-2 border-green-500 text-white font-display font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-2xl leading-none">
              {tDynamic(product.badge)}
            </span>
          )}

          {/* Precio */}
          <span className="absolute bottom-3 right-3 z-20 bg-black border-2 border-green-500/70 text-white font-display font-black text-lg sm:text-xl px-4 py-1.5 rounded-xl shadow-2xl leading-none">
            {(product.price || 0).toFixed(2).replace('.', ',')} €
          </span>
        </div>

        {/* Textos */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className="flex-1">
            <h3 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wide leading-tight group-hover:text-green-400 transition-colors">
              {tDynamic(product.name)}
            </h3>
            {highlightIngredients(tDynamic(product.desc || ''))}
          </div>

          {/* Botón de pedido */}
          <button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-green-600 hover:to-green-700 text-white font-display font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-[0_10px_25px_-5px_rgba(22,163,74,0.4)] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>{t('order_now')}</span>
          </button>
        </div>
      </div>

      {showSauceModal && (
        <SauceModal product={product} onClose={() => setShowSauceModal(false)} />
      )}

      {showAddToCartModal && (
        <AddToCartModal product={product} onClose={() => setShowAddToCartModal(false)} />
      )}
    </>
  );
}
