import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

interface Product {
  id: number | string;
  name: string;
  price: number;
  desc?: string;
  isGroup?: boolean;
  subProducts?: any[];
}

interface AddToCartModalProps {
  product: Product;
  onClose: () => void;
}

export default function AddToCartModal({ product, onClose }: AddToCartModalProps) {
  useHardwareBack(true, onClose);
  
  const [quantity, setQuantity] = useState(1);
  const [groupQuantities, setGroupQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const addItem = useCartStore(state => state.addItem);
  const { t, tDynamic } = useI18nStore();

  const finalPrice = product.isGroup && product.subProducts
    ? Object.entries(groupQuantities).reduce((acc, [id, qty]) => {
        const subProd = product.subProducts!.find(p => String(p.id) === String(id));
        return acc + (subProd ? subProd.price * qty : 0);
      }, 0)
    : product.price * quantity;

  const handleAddToCart = () => {
    if (product.isGroup && product.subProducts) {
      let added = false;
      Object.entries(groupQuantities).forEach(([id, qty]) => {
        if (qty > 0) {
          const subProd = product.subProducts!.find(p => String(p.id) === String(id));
          if (subProd) {
            addItem({
              id: crypto.randomUUID(),
              productId: subProd.id,
              name: subProd.name,
              price: subProd.price,
              quantity: qty,
              notes: notes.trim()
            });
            added = true;
          }
        }
      });
      if (added) onClose();
      return;
    }

    addItem({
      id: crypto.randomUUID(),
      productId: typeof product.id === 'number' ? product.id : 0,
      name: product.name,
      price: product.price,
      quantity,
      notes: notes.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 pt-6 sm:pt-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-[#14141E] flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-display font-black text-xl text-white uppercase tracking-wider pr-4">
              {tDynamic(product.name)}
            </h2>
            {!product.isGroup && (
              <p className="text-green-400 font-bold mt-1 text-lg">{product.price.toFixed(2).replace('.', ',')} €</p>
            )}
            {product.isGroup && (
              <p className="text-zinc-400 text-sm mt-1">{product.desc ? tDynamic(product.desc) : t('choose_options')}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-xl shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
          
          {product.isGroup && product.subProducts ? (
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">{t('available_options')}</label>
              <div className="space-y-2">
                {product.subProducts.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">{tDynamic(sub.name)}</span>
                      <span className="text-green-400 font-bold text-sm">{sub.price.toFixed(2).replace('.', ',')} €</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setGroupQuantities(prev => ({ ...prev, [sub.id]: Math.max(0, (prev[sub.id] || 0) - 1) }))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold text-lg transition-colors disabled:opacity-50"
                        disabled={!(groupQuantities[sub.id] > 0)}
                      >-</button>
                      <span className="font-display font-black text-lg text-white w-6 text-center">{groupQuantities[sub.id] || 0}</span>
                      <button 
                        onClick={() => setGroupQuantities(prev => ({ ...prev, [sub.id]: (prev[sub.id] || 0) + 1 }))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold text-lg transition-colors"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">{t('quantity')}</label>
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold text-xl transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="font-display font-black text-xl text-white w-12 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold text-xl transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold flex justify-between">
              {t('notes_for_kitchen')}
              <span className="text-zinc-600 font-normal lowercase tracking-normal">{t('optional')}</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notes_placeholder')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none h-20 text-sm custom-scrollbar transition-all"
            ></textarea>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-[#0A0A0E] flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-gray-400 text-[10px] mb-1 uppercase tracking-wider font-bold">{t('total')}</div>
            <div className="text-white font-display font-black text-xl">
              {finalPrice.toFixed(2).replace('.', ',')} €
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.isGroup ? finalPrice === 0 : false}
            className="px-6 py-3.5 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('add_to_order')}
          </button>
        </div>
      </div>
    </div>
  );
}
