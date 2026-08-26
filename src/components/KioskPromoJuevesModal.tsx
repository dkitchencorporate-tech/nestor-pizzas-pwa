import { useState } from 'react';
import { NESTOR_PRODUCTS, Product } from '../data/products';
import { CartItem } from '../store/cartStore';
import { useI18nStore } from '../store/i18nStore';
import { useHardwareBack } from '../utils/useHardwareBack';

interface PromoJuevesModalProps {
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'id'>) => void;
}

export default function KioskPromoJuevesModal({ onClose, onAdd }: PromoJuevesModalProps) {
  const [selectedPizzas, setSelectedPizzas] = useState<Product[]>([]);
  const { t } = useI18nStore();
  
  useHardwareBack(true, onClose);

  // Developer Bypass: Set to true to test on any day. Set to false for production.
  const DEV_BYPASS = false;
  const isJueves = new Date().getDay() === 4 || DEV_BYPASS;

  const validPizzas = NESTOR_PRODUCTS.filter(p => p.category === 'NUESTRAS PIZZAS');

  const handleAddPizza = (pizza: Product) => {
    setSelectedPizzas(prev => [...prev, pizza]);
  };

  const handleRemovePizza = (indexToRemove: number) => {
    setSelectedPizzas(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const pairs = Math.floor(selectedPizzas.length / 2);
  const remainder = selectedPizzas.length % 2;
  
  // Las pizzas en promoción cuestan 5.50€ cada una (2x11€)
  // Ordenamos de mayor a menor precio para que el cliente siempre se beneficie de la oferta en las más caras.
  const sortedSelected = [...selectedPizzas].sort((a, b) => b.price - a.price);
  
  const totalPrice = (pairs * 11) + (remainder > 0 ? sortedSelected[sortedSelected.length - 1].price : 0);

  const handleAddToCart = () => {
    if (selectedPizzas.length === 0) return;

    sortedSelected.forEach((p, index) => {
      const isPromo = index < pairs * 2;
      onAdd({
        productId: p.id,
        name: `${p.name} ${isPromo ? `(${t('promo_title_2')})` : ''}`,
        price: isPromo ? 5.50 : p.price,
        quantity: 1
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      <div className="bg-zinc-900 border border-green-500/40 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[94vh] animate-fade text-white relative">
        
        {/* Header */}
        <div className="p-4 pt-6 sm:p-6 sm:pt-8 bg-gradient-to-r from-green-900 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-green-500 flex items-center gap-1.5">
              <span>{t('promo_badge')}</span>
            </span>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-white mt-0.5 uppercase">{t('promo_title_2')}</h3>
            <p className="text-sm text-zinc-400 mt-1">{t('promo_subtitle_2')}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl font-bold p-2 bg-zinc-900 rounded-2xl border border-zinc-800 shrink-0 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Lista de Pizzas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar border-b md:border-b-0 md:border-r border-zinc-800 relative">
            {!isJueves ? (
              <div className="absolute inset-0 z-10 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <span className="text-6xl mb-4">📅</span>
                <h4 className="text-2xl font-display font-black uppercase text-white mb-2">{t('not_thursday_title')}</h4>
                <p className="text-zinc-400 font-medium max-w-sm">{t('not_thursday_desc')}</p>
                <button onClick={onClose} className="mt-6 bg-green-600 text-white font-bold px-6 py-3 rounded-xl uppercase tracking-wider text-sm hover:bg-green-500 transition-all">
                  {t('back_to_menu')}
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {validPizzas.map(pizza => (
                <div 
                  key={pizza.id} 
                  onClick={() => isJueves && handleAddPizza(pizza)}
                  className={`bg-zinc-800/50 border border-zinc-700/50 hover:border-green-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer group ${!isJueves ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div>
                    <span className="font-bold text-white text-xs sm:text-sm block leading-tight">{pizza.name}</span>
                    <span className="text-[10px] text-zinc-400 block mt-1 line-clamp-2">{pizza.desc}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-zinc-500 text-xs line-through">{pizza.price.toFixed(2)}€</span>
                    <button className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 font-bold text-[10px] uppercase tracking-wider group-hover:bg-green-500 group-hover:text-white transition-all">
                      {t('add_item')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Resumen */}
          <div className="w-full md:w-80 bg-zinc-950 flex flex-col shrink-0">
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto no-scrollbar">
              <h4 className="font-display font-bold text-sm text-zinc-500 uppercase tracking-wider mb-4">{t('selected_pizzas')}</h4>
              
              {selectedPizzas.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl opacity-50 block mb-2">🍕</span>
                  <p className="text-zinc-500 text-sm font-medium">{t('no_pizza_selected')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSelected.map((pizza, index) => {
                    const isPromo = index < pairs * 2;
                    return (
                      <div key={index} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-xl relative group">
                        <div className="flex-1">
                          <span className="font-bold text-sm text-white block">{pizza.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isPromo ? 'text-green-400' : 'text-zinc-500'}`}>
                            {isPromo ? t('promo_price_label') : `${t('normal_price_label')} (${pizza.price.toFixed(2)}€)`}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemovePizza(index)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 bg-zinc-900 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-zinc-400 text-sm font-medium">{t('applied_promos')}</span>
                <span className="font-bold text-green-400">{pairs}{t('promo_multiplier')}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-black text-xl text-white uppercase tracking-wider">{t('total_label')}</span>
                <span className="font-display font-black text-3xl text-green-500">{totalPrice.toFixed(2)}€</span>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={selectedPizzas.length === 0}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-black px-4 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] flex items-center justify-center gap-2"
              >
                {t('add_promo_cart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
