import { useCartStore } from '../store/cartStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-[#0A0A0E] border-l border-green-500/30 flex flex-col shadow-2xl transform transition-transform">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider">Tu Pedido</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-6">
              <div className="relative">
                <svg className="w-24 h-24 text-green-500/20 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-50">🍕</span>
              </div>
              <div className="text-center space-y-2">
                <p className="font-display font-black text-xl text-white uppercase tracking-widest">Carrito Vacío</p>
                <p className="font-medium text-sm text-zinc-400 px-4">Tu estómago ruge... ¡Es hora de añadir algo delicioso!</p>
              </div>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 bg-[#14141E] p-4 rounded-2xl border border-zinc-800">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white uppercase">{item.name}</h3>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 p-1 hover:bg-red-500/10 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  
                  {item.extraDescription && (
                    <p className="text-xs text-gray-400 mt-1">{item.extraDescription}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-yellow-500 mt-1 italic">"{item.notes}"</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-zinc-800">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-zinc-800 rounded-md text-white hover:bg-zinc-700"
                      >
                        -
                      </button>
                      <span className="font-bold text-white w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-zinc-800 rounded-md text-white hover:bg-zinc-700"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-green-400 text-lg">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#14141E] border-t border-zinc-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-400 font-medium">Total Pedido</span>
            <span className="font-display font-black text-4xl text-white">{getTotal().toFixed(2)}€</span>
          </div>
          <button 
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 hover:bg-green-400 text-black font-black text-xl py-4 rounded-2xl uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:shadow-none transition-all"
          >
            PAGAR AHORA
          </button>
        </div>
      </div>
    </div>
  );
}
