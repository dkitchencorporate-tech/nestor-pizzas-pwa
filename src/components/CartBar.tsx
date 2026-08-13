import { useCartStore } from '../store/cartStore';

interface CartBarProps {
  onOpenUpsell: () => void;
}

export default function CartBar({ onOpenUpsell }: CartBarProps) {
  const items = useCartStore(state => state.items);
  const getTotal = useCartStore(state => state.getTotal);
  
  if (items.length === 0) return null;

  const total = getTotal();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[rgba(10,10,14,0.97)] backdrop-blur-[20px] border border-green-500/40 text-white rounded-[1.75rem] shadow-[0_8px_40px_rgba(34,197,94,0.2),0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all w-[calc(100%-2rem)] max-w-[420px] overflow-hidden"
      onClick={onOpenUpsell}
    >
      {/* Left: Cart info */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Cart icon with badge */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[11px] min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-[#0A0A0E] px-1 shadow-lg">
            {totalItems}
          </span>
        </div>
        {/* Price */}
        <div>
          <span className="text-[9px] font-bold text-green-400/80 uppercase tracking-[0.15em] block leading-none">Comanda</span>
          <span className="font-display font-black text-xl sm:text-2xl text-white leading-tight">{total.toFixed(2).replace('.', ',')} €</span>
        </div>
      </div>

      {/* Right: CTA */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 h-full px-5 py-3 font-display font-black text-sm uppercase tracking-wider text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)] whitespace-nowrap">
        <span>Tramitar</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}
