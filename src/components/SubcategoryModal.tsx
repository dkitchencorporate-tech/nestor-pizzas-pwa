import { generateSafeUUID } from '../utils/uuid';
import { useState, useEffect } from 'react';
import { useI18nStore } from '../store/i18nStore';
import { useCartStore } from '../store/cartStore';

interface SubcategoryModalProps {
  productGroup: any;
  onClose: () => void;
}

export default function SubcategoryModal({ productGroup, onClose }: SubcategoryModalProps) {
  const { t, tDynamic, lang } = useI18nStore() as any;
  const addItem = useCartStore(state => state.addItem);

  // State to track quantities per sub-product ID
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    (productGroup.subProducts || []).forEach((p: any) => {
      initial[p.id] = 1;
    });
    return initial;
  });

  // State to give visual feedback when adding to cart
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const displayName = lang === 'en' && productGroup.name_en ? productGroup.name_en : tDynamic(productGroup.name);
  const displayDesc = lang === 'en' && productGroup.description_en ? productGroup.description_en : tDynamic(productGroup.description);

  const handleQuantityChange = (id: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (subProd: any) => {
    const qty = quantities[subProd.id] || 1;
    addItem({
      id: generateSafeUUID(),
      productId: subProd.id,
      name: subProd.name,
      price: subProd.price,
      quantity: qty,
      notes: ''
    });

    setAddedIds(prev => ({ ...prev, [subProd.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [subProd.id]: false }));
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111118] border border-zinc-800 sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative animate-slide-up rounded-t-[2rem] overflow-hidden text-white">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800 p-5 rounded-t-[2rem] sm:rounded-t-3xl z-10 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-green-400 block mb-0.5">
              {t('select_beverages') || 'SELECCIONA TUS BEBIDAS'}
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-wider">{displayName}</h2>
            {displayDesc && <p className="text-zinc-400 text-xs mt-0.5">{displayDesc}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-zinc-800/80 hover:bg-zinc-700 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-zinc-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de Bebidas Limpia y Rápida */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 no-scrollbar">
          {(productGroup.subProducts || []).map((subProd: any) => {
            const qty = quantities[subProd.id] || 1;
            const isAdded = addedIds[subProd.id];
            const itemPrice = subProd.price || 0;
            const subProdName = lang === 'en' && subProd.name_en ? subProd.name_en : tDynamic(subProd.name);

            return (
              <div 
                key={subProd.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-green-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-white text-sm sm:text-base block truncate">
                      {subProdName}
                    </span>
                    {subProd.badge && (
                      <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                        {tDynamic(subProd.badge)}
                      </span>
                    )}
                  </div>
                  <span className="font-display font-black text-green-400 text-sm sm:text-base mt-1 block">
                    {itemPrice.toFixed(2).replace('.', ',')} €
                  </span>
                </div>

                {/* Controles de Cantidad y Añadir */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Selector - 1 + */}
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleQuantityChange(subProd.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 font-black text-sm active:scale-90 transition-all"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-display font-black text-xs text-white">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(subProd.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 font-black text-sm active:scale-90 transition-all"
                    >
                      +
                    </button>
                  </div>

                  {/* Botón Añadir */}
                  <button
                    onClick={() => handleAddToCart(subProd)}
                    className={`font-display font-black px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                      isAdded
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-green-600 hover:to-green-700 text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <span>✓</span>
                        <span>{t('added') || 'AÑADIDO'}</span>
                      </>
                    ) : (
                      <>
                        <span>+</span>
                        <span>{t('add_item') || 'AÑADIR'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-display font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)] text-center"
          >
            {t('ready') || 'LISTO'}
          </button>
        </div>

      </div>
    </div>
  );
}
