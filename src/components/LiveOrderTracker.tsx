import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

export default function LiveOrderTracker() {
  const { orders } = useAuthStore();
  const cartHasItems = useCartStore(state => state.items.length > 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeliveryToast, setShowDeliveryToast] = useState(false);
  const [lastDeliveredOrder, setLastDeliveredOrder] = useState<any>(null);

  // Find the most recent active order
  const activeOrder = useMemo(() => {
    return (orders || []).find((o: any) => ['pending', 'cooking', 'delivering'].includes(o?.status));
  }, [orders]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('AudioContext error', e);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerNativeNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/brand/icon-192.png',
        badge: '/assets/brand/icon-192.png',
        vibrate: [200, 100, 200]
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pending': 
        return { icon: '⏳', label: 'PEDIDO RECIBIDO', color: 'text-yellow-400', bg: 'bg-yellow-400', desc: 'Estamos confirmando tu pedido.' };
      case 'cooking': 
        return { icon: '🔥', label: 'COCINANDO', color: 'text-orange-400', bg: 'bg-orange-400', desc: 'Tu comida está en el horno.' };
      case 'delivering': 
        return { icon: '🛵', label: 'EN REPARTO', color: 'text-blue-400', bg: 'bg-blue-400', desc: 'El repartidor va en camino.' };
      case 'ready':
        return { icon: '🛍️', label: 'LISTO PARA RECOGER', color: 'text-yellow-400', bg: 'bg-yellow-400', desc: 'Tu pedido está listo en el local.' };
      case 'cancelled':
        return { icon: '❌', label: 'PEDIDO CANCELADO', color: 'text-red-500', bg: 'bg-red-500', desc: 'Tu pedido ha sido cancelado.' };
      default: 
        return { icon: '✅', label: 'COMPLETADO', color: 'text-green-400', bg: 'bg-green-400', desc: 'Pedido entregado.' };
    }
  };

  // Listen for the custom events dispatched by authStore
  useEffect(() => {
    const handleDelivered = (e: any) => {
      setLastDeliveredOrder(e.detail);
      setShowDeliveryToast(true);
      playNotificationSound();
      triggerNativeNotification('¡Pedido Entregado!', 'Esperamos que lo disfrutes muchísimo. Gracias por confiar en Néstor Pizzas.');
      // Auto-hide after 8 seconds
      setTimeout(() => setShowDeliveryToast(false), 8000);
    };

    const handleStatusChanged = (e: any) => {
      playNotificationSound();
      const statusInfo = getStatusInfo(e.detail.status);
      triggerNativeNotification('Actualización de Pedido', statusInfo.label + ': ' + statusInfo.desc);
    };

    window.addEventListener('order-delivered', handleDelivered);
    window.addEventListener('order-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('order-delivered', handleDelivered);
      window.removeEventListener('order-status-changed', handleStatusChanged);
    };
  }, []);

  if (!activeOrder && !showDeliveryToast) return null;

  const statusInfo = activeOrder ? getStatusInfo(activeOrder.status) : null;

  return (
    <>
      {/* Floating Active Order Tracker */}
      {activeOrder && (
        <div className={`fixed z-[1000] left-1/2 -translate-x-1/2 transition-all duration-300 transform ${isExpanded ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-90 hover:scale-100 hover:opacity-100'} ${cartHasItems ? 'bottom-24 sm:bottom-28' : 'bottom-4 sm:bottom-6'}`}>
          
          {/* Expanded State */}
          <div className={`bg-zinc-950 border ${isExpanded ? 'border-green-500/50' : 'border-zinc-800'} rounded-[1.75rem] shadow-2xl p-4 w-[calc(100vw-2rem)] max-w-[420px] transition-all duration-300 overflow-hidden cursor-pointer mx-auto`} onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${statusInfo?.color} animate-pulse`}>
                • Tracking Activo
              </span>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner relative overflow-hidden">
                <span className="relative z-10 animate-bounce">{statusInfo?.icon}</span>
                {activeOrder.status === 'cooking' && (
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-orange-500/20 blur-md"></div>
                )}
              </div>
              <div>
                <h4 className="font-display font-black text-white uppercase text-lg leading-tight">{statusInfo?.label}</h4>
                <p className="text-xs text-zinc-400 font-medium">{statusInfo?.desc}</p>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in">
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mb-3">
                  <div className={`h-full ${statusInfo?.bg} transition-all duration-1000`} style={{ 
                    width: activeOrder.status === 'pending' ? '33%' : activeOrder.status === 'cooking' ? '66%' : '100%' 
                  }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span className={activeOrder.status === 'pending' ? 'text-yellow-400' : 'text-white'}>Recibido</span>
                  <span className={activeOrder.status === 'cooking' ? 'text-orange-400' : activeOrder.status === 'delivering' ? 'text-white' : ''}>Cocina</span>
                  <span className={activeOrder.status === 'delivering' ? 'text-blue-400' : ''}>Camino</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Success Toast */}
      {showDeliveryToast && lastDeliveredOrder && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-green-500/50 rounded-[2rem] p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.2)] transform scale-100 animate-[spring_0.5s]">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
              <span className="text-5xl relative z-10">🎉</span>
            </div>
            
            <h3 className="font-display font-black text-3xl text-white uppercase mb-2 tracking-wide">¡Pedido Entregado!</h3>
            <p className="text-zinc-400 mb-6 font-medium">Esperamos que lo disfrutes muchísimo. Gracias por confiar en Néstor Pizzas.</p>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Puntos Acumulados</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-yellow-400 text-2xl">⭐</span>
                <span className="font-display font-black text-3xl text-yellow-400">
                  +{Math.floor(lastDeliveredOrder.total_amount / 10) * 4} pts
                </span>
              </div>
            </div>

            <a 
              href="https://share.google/vWreLglBggLldM3Xm"
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-3 mb-3 bg-white hover:bg-gray-100 text-black font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              ⭐ Déjanos una reseña
            </a>
            
            <button 
              onClick={() => setShowDeliveryToast(false)}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-lg uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
