import { Product } from '../data/products';
import { useState, useMemo } from 'react';
import { NESTOR_INGREDIENTS_OFICIAL } from '../data/products';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

// fallback image just in case
const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80';

interface IngredientsModalProps {
  product: Product;
  onClose: () => void;
}

export default function IngredientsModal({ product, onClose }: IngredientsModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic, lang } = useI18nStore() as any;
  const displayName = lang === 'en' && (product as any).name_en ? (product as any).name_en : tDynamic(product.name);
  
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [activeHalf, setActiveHalf] = useState<'full' | 'left' | 'right'>('full');
  const isPizzasBlancas = (product as any).category_id === 'PIZZAS BLANCAS' || product.category === 'PIZZAS BLANCAS';
  const isNuestrasPizzas = (product as any).category_id === 'NUESTRAS PIZZAS' || product.category === 'NUESTRAS PIZZAS';
  const isPorIngredientes = (product as any).category_id === 'POR INGREDIENTES' || product.category === 'POR INGREDIENTES' || product.id === 22;
  const isMaxxiPizza = product.name.toUpperCase().includes('MAZZI') || product.name.toUpperCase().includes('MAXXI');

  const [pizzaBase, setPizzaBase] = useState<'Normal' | 'Blanca' | 'Maxxi'>(() => {
    if (isPizzasBlancas) return 'Blanca';
    if (isMaxxiPizza) return 'Maxxi';
    return 'Normal';
  });
  const [itemNotes, setItemNotes] = useState('');
  const addItem = useCartStore(state => state.addItem);

  const BASE_PRICE = product.price;
  const isCustomPizza = product.name.toUpperCase().includes('MAZZI') || product.category === 'POR INGREDIENTES' || product.id === 22;

  const toggleIngredient = (baseIng: string) => {
    const suffix = activeHalf === 'left' ? ' (Mitad Izq)' : activeHalf === 'right' ? ' (Mitad Der)' : '';
    const ing = baseIng + suffix;
    setSelectedIngredients(prev => 
      prev.includes(ing) 
        ? prev.filter(i => i !== ing)
        : [...prev, ing]
    );
  };
  
  const isSelected = (baseIng: string) => {
    const suffix = activeHalf === 'left' ? ' (Mitad Izq)' : activeHalf === 'right' ? ' (Mitad Der)' : '';
    return selectedIngredients.includes(baseIng + suffix);
  };

  const ingredientsCost = selectedIngredients.length * 1.00; // +1€ por ingrediente adicional
  // Si el producto YA es Mazzi Pizza, su precio base ya incluye la masa especial (baseCost = 0€)
  // El suplemento de +3€ solo se aplica si se amplía a masa Maxxi desde otra pizza
  const baseCost = (!isMaxxiPizza && pizzaBase === 'Maxxi') ? 3.00 : 0;
  const finalPrice = BASE_PRICE + ingredientsCost + baseCost;

  const handleAddToCart = () => {
    const ingText = selectedIngredients.length > 0 
      ? ` + ${selectedIngredients.join(', ')}` 
      : '';
    
    const baseText = (!isMaxxiPizza && pizzaBase !== 'Normal') ? ` (Base ${pizzaBase})` : '';
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      name: `${product.name}${baseText}${ingText}`,
      price: finalPrice,
      quantity: 1,
      extras: selectedIngredients,
      notes: itemNotes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
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
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)] shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <span className="truncate">{t('custom_taste')}</span>
              </h2>
              <p className="text-gray-300 mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium drop-shadow-md pr-2">{t('config_pizza_ingredients')}</p>
            </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {isCustomPizza && (
            <>
              <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setActiveHalf('full')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg border-2 transition-all ${activeHalf === 'full' ? 'bg-zinc-700 text-white border-green-500 shadow-md' : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                >
                  Completa
                </button>
                <button
                  onClick={() => setActiveHalf('left')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg border-2 transition-all ${activeHalf === 'left' ? 'bg-zinc-700 text-white border-green-500 shadow-md' : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                >
                  Mitad Izq
                </button>
                <button
                  onClick={() => setActiveHalf('right')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg border-2 transition-all ${activeHalf === 'right' ? 'bg-zinc-700 text-white border-green-500 shadow-md' : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                >
                  Mitad Der
                </button>
              </div>

              {/* Resumen Actual */}
              {selectedIngredients.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h4 className="text-zinc-400 text-xs font-bold uppercase mb-3">Resumen de Ingredientes Extras</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Completa */}
                    <div className="bg-[#0A0A0E] p-3 rounded-lg border border-zinc-800">
                      <div className="text-white text-xs font-bold mb-2 opacity-80 border-b border-zinc-800 pb-1">COMPLETA</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedIngredients.filter(i => !i.includes('(Mitad')).map(i => (
                          <span key={i} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">{i}</span>
                        ))}
                        {selectedIngredients.filter(i => !i.includes('(Mitad')).length === 0 && <span className="text-zinc-600 text-xs">-</span>}
                      </div>
                    </div>
                    {/* Mitad Izq */}
                    <div className="bg-[#0A0A0E] p-3 rounded-lg border border-zinc-800">
                      <div className="text-white text-xs font-bold mb-2 opacity-80 border-b border-zinc-800 pb-1">MITAD IZQ</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedIngredients.filter(i => i.includes('(Mitad Izq)')).map(i => (
                          <span key={i} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">{i.replace(' (Mitad Izq)', '')}</span>
                        ))}
                        {selectedIngredients.filter(i => i.includes('(Mitad Izq)')).length === 0 && <span className="text-zinc-600 text-xs">-</span>}
                      </div>
                    </div>
                    {/* Mitad Der */}
                    <div className="bg-[#0A0A0E] p-3 rounded-lg border border-zinc-800">
                      <div className="text-white text-xs font-bold mb-2 opacity-80 border-b border-zinc-800 pb-1">MITAD DER</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedIngredients.filter(i => i.includes('(Mitad Der)')).map(i => (
                          <span key={i} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">{i.replace(' (Mitad Der)', '')}</span>
                        ))}
                        {selectedIngredients.filter(i => i.includes('(Mitad Der)')).length === 0 && <span className="text-zinc-600 text-xs">-</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isCustomPizza && selectedIngredients.length > 0 && (
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
               <h4 className="text-zinc-400 text-xs font-bold uppercase mb-3">Ingredientes Extras Añadidos</h4>
               <div className="flex flex-wrap gap-2">
                 {selectedIngredients.map(i => (
                    <span key={i} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-md border border-green-500/30">{i}</span>
                 ))}
               </div>
             </div>
          )}

          
          
          {/* Selector de Base */}
          {!isMaxxiPizza && (
            <div className="mb-4">
              <h4 className="text-white font-bold mb-2 uppercase tracking-wider text-sm flex items-center gap-2">🍕 {t('select_base')}</h4>
              <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {(!isPizzasBlancas) && (
                  <button 
                    onClick={() => setPizzaBase('Normal')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${pizzaBase === 'Normal' ? 'bg-zinc-700 text-white shadow-md border-b-2 border-green-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  >
                    {t('base_normal')}
                  </button>
                )}
                {(!isNuestrasPizzas) && (
                  <button 
                    onClick={() => setPizzaBase('Blanca')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${pizzaBase === 'Blanca' ? 'bg-zinc-700 text-white shadow-md border-b-2 border-blue-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  >
                    {t('base_blanca')}
                  </button>
                )}
                {(!isPorIngredientes) && (
                  <button 
                    onClick={() => setPizzaBase('Maxxi')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${pizzaBase === 'Maxxi' ? 'bg-zinc-700 text-white shadow-md border-b-2 border-orange-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  >
                    {t('base_maxxi')}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Notas Adicionales */}
          <div className="mb-4">
            <label className="text-white font-bold mb-2 uppercase tracking-wider text-sm flex items-center gap-2">📝 {t('special_notes')}</label>
            <input 
              type="text" 
              placeholder={t('pizza_notes_placeholder')}
              value={itemNotes} 
              onChange={(e) => setItemNotes(e.target.value)} 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
            />
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
             <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-bold uppercase text-lg">{displayName} {t('base_label')}</h4>
                <span className="text-green-400 font-bold text-lg">{BASE_PRICE.toFixed(2).replace('.', ',')}€</span>
             </div>
             <p className="text-sm text-gray-400">
               {isMaxxiPizza ? '31cm · 5 Quesos' : (product as any).category_id === 'CALZONES' ? '' : '33cm · '}
               {product.description ? tDynamic(product.description) : product.desc ? tDynamic(product.desc) : ''}
             </p>
          </div>

          {/* Ingredients Selection */}
          <section>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="bg-green-500 w-2 h-2 rounded-full inline-block"></span>
              {t('add_extra_ingredients')}
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {NESTOR_INGREDIENTS_OFICIAL.map(ing => {
                const isSel = isSelected(ing);
                return (
                  <button
                    key={ing}
                    onClick={() => toggleIngredient(ing)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isSel 
                        ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                        : 'bg-zinc-900 text-gray-300 border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800'
                    }`}
                  >
                    {tDynamic(ing)}
                    {isSel && <span className="ml-2 bg-black/20 px-1.5 rounded text-xs">+1€</span>}
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
