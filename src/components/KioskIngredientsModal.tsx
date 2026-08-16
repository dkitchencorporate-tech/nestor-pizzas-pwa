import { useState } from 'react';
import { NESTOR_INGREDIENTS_OFICIAL, Product } from '../data/products';
import { CartItem } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

// fallback image just in case
const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80';

interface IngredientsModalProps {
  product: Product;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'id'>) => void;
}

export default function KioskIngredientsModal({ product, onClose, onAdd }: IngredientsModalProps) {
  useHardwareBack(true, onClose);
  const { t } = useI18nStore();
  
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const BASE_PRICE = product.price;

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients(prev => 
      prev.includes(ing) 
        ? prev.filter(i => i !== ing)
        : [...prev, ing]
    );
  };

  const ingredientsCost = selectedIngredients.length * 1.00; // +1€ por ingrediente adicional
  const finalPrice = BASE_PRICE + ingredientsCost;

  const handleAddToCart = () => {
    const ingText = selectedIngredients.length > 0 
      ? ` + ${selectedIngredients.join(', ')}` 
      : '';
    
    onAdd({
      productId: product.id,
      name: `${product.name}${ingText}`,
      price: finalPrice,
      quantity: 1,
      extras: selectedIngredients
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header con Imagen */}
        <div className="relative h-40 sm:h-56 shrink-0 border-b border-zinc-800 bg-[#0A0A0E]">
            <img 
                src={(product as any).img_url || (product as any).img || fallbackImg} 
                alt={product.name} 
                className="w-full h-full object-cover opacity-70 mix-blend-lighten"
                onError={(e) => { e.currentTarget.src = fallbackImg; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14141E] via-transparent to-black/50"></div>
            
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-white hover:text-green-400 transition-colors bg-black/50 hover:bg-black/80 p-2 rounded-xl backdrop-blur-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div className="absolute bottom-4 left-4 sm:left-6 right-4">
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wider flex items-center gap-2 sm:gap-3 drop-shadow-xl">
                <div className="w-8 h-8 sm:w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)] shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <span className="truncate">{t('custom_taste')}</span>
              </h2>
              <p className="text-gray-300 mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium drop-shadow-md pr-2">{t('config_pizza_ingredients')}</p>
            </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
             <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-bold uppercase text-lg">{product.name} {t('base_label')}</h4>
                <span className="text-green-400 font-bold text-lg">{BASE_PRICE.toFixed(2).replace('.', ',')}€</span>
             </div>
             <p className="text-sm text-gray-400">33cm - {product.desc}</p>
          </div>

          {/* Ingredients Selection */}
          <section>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="bg-green-500 w-2 h-2 rounded-full inline-block"></span>
              {t('add_extra_ingredients')}
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {NESTOR_INGREDIENTS_OFICIAL.map(ing => {
                const isSelected = selectedIngredients.includes(ing);
                return (
                  <button
                    key={ing}
                    onClick={() => toggleIngredient(ing)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isSelected 
                        ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                        : 'bg-zinc-900 text-gray-300 border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800'
                    }`}
                  >
                    {ing}
                    {isSelected && <span className="ml-2 bg-black/20 px-1.5 rounded text-xs">+1€</span>}
                  </button>
                )
              })}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-[#0A0A0E] flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-bold">{t('total_pizza')}</div>
            <div className="text-white font-display font-black text-2xl">
              {finalPrice.toFixed(2).replace('.', ',')} €
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className="px-8 py-4 rounded-2xl font-display font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)]"
          >
            {t('add_to_order')} <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
