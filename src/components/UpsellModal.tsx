import { useState } from 'react';
import { X } from 'lucide-react';
import { useHardwareBack } from '../utils/useHardwareBack';
import { NESTOR_UPSELLS } from '../data/products';
import { useCartStore } from '../store/cartStore';

interface UpsellModalProps {
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export default function UpsellModal({ onClose, onProceedToCheckout }: UpsellModalProps) {
  const addItem = useCartStore(state => state.addItem);
  useHardwareBack(true, onClose);
  const [addedItems, setAddedItems] = useState<string[]>([]);
  // Simulated shuffle
  const [shuffleKey, setShuffleKey] = useState(0);

  const handleAdd = (item: any) => {
    addItem({
      id: crypto.randomUUID(),
      productId: parseInt(item.id.replace('u', '100')), // Fake numeric ID for upsells
      name: item.name,
      price: item.price,
      quantity: 1,
      notes: ''
    });
    setAddedItems([...addedItems, item.id]);
  };

  const shuffleDynamicUpsells = () => {
    setShuffleKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      <div className="bg-zinc-900 border border-yellow-500/40 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade text-white relative">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
              <span>★ Recomendación Especial del Horno</span>
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-white mt-0.5 uppercase">¿COMPLETAS TU COMANDA?</h3>
            <p className="text-[11px] sm:text-sm text-zinc-400 mt-0.5">Complementos y bebidas Gourmet de Caniles elaborados al momento</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl font-bold p-2 bg-zinc-900 rounded-2xl border border-zinc-800 shrink-0 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm sm:text-sm font-medium text-zinc-300 max-h-[52vh] no-scrollbar space-y-6" key={shuffleKey}>
          {NESTOR_UPSELLS.map(category => (
            <div key={category.category}>
              <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3 border-b border-zinc-800 pb-2">
                {category.category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.items.map(item => {
                  const isAdded = addedItems.includes(item.id);
                  return (
                    <div key={item.id} className="bg-zinc-800/50 border border-zinc-700/50 hover:border-yellow-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
                      <div>
                        <span className="font-bold text-white text-xs sm:text-sm block">{item.name}</span>
                        <span className="text-[10px] sm:text-[11px] text-zinc-400 block mt-0.5">{item.desc}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-green-400 text-sm">{item.price.toFixed(2).replace('.', ',')} €</span>
                        <button 
                          onClick={() => handleAdd(item)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-xl font-display font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all shadow-sm ${
                            isAdded 
                              ? 'bg-zinc-800 text-green-500 border border-zinc-700 cursor-not-allowed' 
                              : 'bg-green-500 hover:bg-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                          }`}
                        >
                          {isAdded ? 'Añadido ✓' : '+ Añadir'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          <button onClick={onClose} className="w-full lg:w-auto bg-zinc-900 hover:bg-yellow-500 hover:text-black text-zinc-300 font-display font-bold px-4 py-3 sm:py-3.5 rounded-2xl text-[11px] sm:text-sm uppercase transition-all border border-zinc-800 flex items-center justify-center gap-2 shadow">
            <span>🍕 + Seguir en Menú</span>
          </button>
          <button onClick={shuffleDynamicUpsells} className="w-full lg:w-auto bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-display font-bold px-4 py-3 sm:py-3.5 rounded-2xl text-[11px] sm:text-sm uppercase transition-all border border-zinc-700 flex items-center justify-center gap-2">
            <span>★ Ver Recomendaciones</span>
          </button>
          <button onClick={() => { onClose(); onProceedToCheckout(); }} className="w-full lg:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-display font-bold px-5 py-3 sm:py-3.5 rounded-2xl shadow-[0_15px_30px_-5px_rgba(22,163,74,0.4)] uppercase tracking-wider text-[11px] sm:text-sm transition-all flex items-center justify-center gap-2">
            <span>💳 Pasarela de Pago (→)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
