import { useState } from 'react';
import { Product } from '../data/products';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';

interface SauceModalProps {
  product: Product;
  onClose: () => void;
}

const SAUCES = [
  { id: 'alioli', name: 'Salsa Alioli', extraCost: 0 },
  { id: 'barbacoa', name: 'Salsa Barbacoa', extraCost: 0 },
  { id: 'brava', name: 'Salsa Brava', extraCost: 0 },
  { id: 'morisca', name: 'Salsa Morisca', extraCost: 0 },
  { id: 'sriracha', name: 'Salsa Sriracha', extraCost: 0 },
  { id: 'cheddar', name: 'Salsa Cheddar (Extra)', extraCost: 1.00 },
];

export default function SauceModal({ product, onClose }: SauceModalProps) {
  useHardwareBack(true, onClose);

  const [selectedSauce, setSelectedSauce] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore(state => state.addItem);

  const sauceObject = SAUCES.find(s => s.id === selectedSauce);
  const finalPrice = product.price + (sauceObject?.extraCost || 0);

  const handleAddToCart = () => {
    if (!selectedSauce) {
      alert('Por favor, selecciona una salsa.');
      return;
    }

    const itemName = `${product.name} (Salsa: ${sauceObject?.name})`;
    const itemNotes = notes.trim() ? `Notas: ${notes.trim()}` : undefined;

    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      name: itemNotes ? `${itemName} - ${itemNotes}` : itemName,
      price: finalPrice,
      quantity: 1
    });

    alert(`${itemName} añadido al pedido.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in flex flex-col max-h-[85vh] mt-10 sm:mt-0">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-[#14141E] relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-zinc-800/50 hover:bg-red-500/80 p-2 rounded-xl transition-all z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider pr-10">{product.name}</h2>
          <p className="text-gray-400 mt-1 text-sm">{product.desc}</p>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Sauces */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="bg-green-500 w-2 h-2 rounded-full inline-block"></span>
              Elige tu salsa (Obligatorio)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAUCES.map(sauce => (
                <button
                  key={sauce.id}
                  onClick={() => setSelectedSauce(sauce.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedSauce === sauce.id 
                      ? 'bg-green-500/10 border-green-500 text-white' 
                      : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:border-green-500/50 hover:bg-zinc-800'
                  }`}
                >
                  <div className="font-bold text-sm">{sauce.name}</div>
                  {sauce.extraCost > 0 && (
                    <div className="text-xs text-green-400 mt-0.5">+{sauce.extraCost.toFixed(2).replace('.', ',')} €</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-white font-bold mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="bg-zinc-600 w-2 h-2 rounded-full inline-block"></span>
              Notas adicionales (Opcional)
            </h3>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-green-500 transition-colors"
              placeholder="Ej. Sin mucha sal, bien hechas..."
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-[#0A0A0E] flex items-center justify-between gap-4">
          <div className="text-white font-display font-black text-xl">
            {finalPrice.toFixed(2).replace('.', ',')} €
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!selectedSauce}
            className={`px-8 py-3.5 rounded-2xl font-display font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedSauce 
                ? 'bg-green-500 text-white hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            AÑADIR <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
