import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGuestOrderStore } from '../store/guestOrderStore';
import { useI18nStore } from '../store/i18nStore';

export default function OrderTracking({ onBack }: { onBack: () => void }) {
  const { t } = useI18nStore();
  const { orders, user } = useAuthStore();
  const { guestOrder } = useGuestOrderStore();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const activeOrder = useMemo(() => {
    // Si hay un usuario logueado, usar sus órdenes. Si no, usar la orden de invitado.
    if (user) {
      return (orders || []).find((o: any) => ['pending', 'cooking', 'delivering', 'ready'].includes(o?.status));
    } else {
      return guestOrder && ['pending', 'cooking', 'delivering', 'ready'].includes(guestOrder.status) ? guestOrder : null;
    }
  }, [orders, guestOrder, user]);

  const historyOrders = useMemo(() => {
    if (user) {
      return (orders || []).filter((o: any) => ['delivered', 'cancelled'].includes(o?.status));
    } else {
      return guestOrder && ['delivered', 'cancelled'].includes(guestOrder.status) ? [guestOrder] : [];
    }
  }, [orders, guestOrder, user]);

  const getStatusIndex = (status: string) => {
    switch(status) {
      case 'pending': return 0;
      case 'cooking': return 1;
      case 'delivering': 
      case 'ready': return 2;
      default: return -1;
    }
  };

  const statusIndex = activeOrder ? getStatusIndex(activeOrder.status) : -1;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col font-sans pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#14141E]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="text-center">
            <h1 className="font-display font-black uppercase text-lg tracking-widest text-white">{t('my_orders')}</h1>
            <p className="text-[10px] text-green-500 font-mono tracking-widest uppercase">{t('brand_name')}</p>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-4 pt-2">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'active' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {t('in_progress')}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {t('history')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 mt-4">
        
        {activeTab === 'active' && (
          <div className="animate-fade-in">
            {!activeOrder ? (
              <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🍕</span>
                </div>
                <h2 className="text-xl font-display font-black text-white uppercase mb-2">{t('no_active_orders')}</h2>
                <p className="text-zinc-500 text-sm mb-8">{t('hungry_check_menu')}</p>
                <button 
                  onClick={onBack}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]"
                >
                  {t('view_menu')}
                </button>
              </div>
            ) : (
              <div className="bg-[#14141E] border border-green-500/30 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)] relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                
                <div className="p-6 border-b border-zinc-800 bg-green-500/5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase bg-green-500/10 px-2 py-1 rounded">{t('active_tracking')}</span>
                      <h2 className="text-2xl font-display font-black text-white uppercase mt-2">ID: {activeOrder.id.slice(0,8)}</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{activeOrder.total_amount}€</span>
                      <p className="text-xs text-zinc-500 font-medium uppercase mt-1">{activeOrder.delivery_method === 'delivery' ? t('delivery_method_home') : t('delivery_method_pickup')}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative pt-8 pb-4">
                    {/* Progress Bar Background */}
                    <div className="absolute top-[42px] left-[10%] right-[10%] h-1 bg-zinc-800 rounded-full"></div>
                    {/* Active Progress Bar */}
                    <div 
                      className="absolute top-[42px] left-[10%] h-1 bg-green-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"
                      style={{ width: `${statusIndex === 0 ? 0 : statusIndex === 1 ? 40 : 80}%` }}
                    ></div>

                    <div className="relative flex justify-between">
                      {/* Step 1: Pending */}
                      <div className="flex flex-col items-center relative z-10 w-1/3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 0 ? 'animate-bounce' : ''}`}>
                          ⏳
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>{t('status_received')}</span>
                      </div>

                      {/* Step 2: Cooking */}
                      <div className="flex flex-col items-center relative z-10 w-1/3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 1 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 1 ? 'animate-bounce' : ''}`}>
                          🔥
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 1 ? 'text-orange-500' : 'text-zinc-600'}`}>{t('status_cooking')}</span>
                      </div>

                      {/* Step 3: Delivering/Ready */}
                      <div className="flex flex-col items-center relative z-10 w-1/3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 2 ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 2 ? 'animate-bounce' : ''}`}>
                          {activeOrder.delivery_method === 'delivery' ? '🛵' : '🛍️'}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 2 ? 'text-blue-400' : 'text-zinc-600'}`}>
                          {activeOrder.delivery_method === 'delivery' ? t('status_delivering_title') : t('status_ready')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-[#0A0A0E] rounded-2xl p-4 border border-zinc-800 text-center">
                    <p className="text-sm text-zinc-300">
                      {statusIndex === 0 && t('tracking_msg_pending')}
                      {statusIndex === 1 && t('tracking_msg_cooking')}
                      {statusIndex === 2 && activeOrder.delivery_method === 'delivery' && t('tracking_msg_delivering')}
                      {statusIndex === 2 && activeOrder.delivery_method === 'pickup' && t('tracking_msg_ready')}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('order_summary')}</h4>
                  <div className="space-y-3">
                    {activeOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                          <span className="text-zinc-200">{item.customization_details?.name || item.products?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in space-y-4">
            {historyOrders.length === 0 ? (
              <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
                <span className="text-4xl mb-4 block">📜</span>
                <p className="text-zinc-500 font-medium">{t('no_completed_orders')}</p>
              </div>
            ) : (
              historyOrders.map((order: any) => (
                <div key={order.id} className="bg-[#14141E] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-zinc-400 font-medium">{formatDate(order.created_at)}</span>
                      <div className="mt-1 flex items-center gap-2">
                        {order.status === 'delivered' ? (
                          <span className="text-[10px] font-bold uppercase text-green-400 bg-green-500/10 px-2 py-1 rounded">{t('status_completed_title')}</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-1 rounded">{t('status_cancelled_title')}</span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500 uppercase bg-zinc-900 px-2 py-1 rounded">ID: {order.id.slice(0,8)}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-white">{order.total_amount}€</span>
                  </div>
                  
                  <div className="mt-4 space-y-1">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="text-sm text-zinc-400">
                        <span className="font-bold text-zinc-300">{item.quantity}x</span> {item.customization_details?.name || item.products?.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
