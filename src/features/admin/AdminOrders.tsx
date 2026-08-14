import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking' | 'ready' | 'delivered'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchOrders();

    // Setup audio
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.loop = true; 
    
    // Realtime subscription
    const channel = supabase.channel('realtime_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        console.log('Nuevo pedido recibido!', payload);
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play error:', e));
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (data) setOrders(data);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const updateOrderStatus = async (id: string, status: string, estimatedTime?: string) => {
    stopAudio();
    const updateData: any = { status };
    if (estimatedTime) {
      updateData.estimated_ready_at = new Date(Date.now() + parseInt(estimatedTime) * 60000).toISOString();
    }
    await supabase.from('orders').update(updateData).eq('id', id);
    setExpandedOrderId(null); // Collapse when moving
    fetchOrders();
  };

  // Derived filtered arrays
  const pending = orders.filter(o => o.status === 'pending');
  const cooking = orders.filter(o => o.status === 'cooking');
  const ready = orders.filter(o => o.status === 'ready' || o.status === 'delivering');
  const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending': return pending;
      case 'cooking': return cooking;
      case 'ready': return ready;
      case 'delivered': return delivered;
    }
  };

  const currentList = getFilteredOrders();

  const toggleAccordion = (id: string) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0E] text-white overflow-hidden">
      
      {/* Header and Controls */}
      <div className="p-4 sm:p-6 border-b border-zinc-800 bg-[#14141E] z-10 shadow-md flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wide flex items-center gap-2">
          Gestor de <span className="text-green-500">Pedidos</span>
        </h2>
        {pending.length > 0 && (
          <button 
            onClick={stopAudio}
            className="px-4 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg text-sm font-bold uppercase animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.3)]"
          >
            Silenciar Alarma ({pending.length})
          </button>
        )}
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800 bg-[#14141E] px-4 pt-2">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Nuevos ({pending.length})
        </button>
        <button 
          onClick={() => setActiveTab('cooking')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'cooking' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Cocina ({cooking.length})
        </button>
        <button 
          onClick={() => setActiveTab('ready')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'ready' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Reparto / Listos ({ready.length})
        </button>
        <button 
          onClick={() => setActiveTab('delivered')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'delivered' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Completados ({delivered.length})
        </button>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar space-y-4">
        
        {currentList.length === 0 ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <span className="text-4xl block mb-4">🍽️</span>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No hay pedidos en esta sección</p>
          </div>
        ) : (
          currentList.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const isDelivery = order.delivery_method === 'delivery';

            return (
              <div 
                key={order.id} 
                className={`bg-[#14141E] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-zinc-500 shadow-xl' : 'border-zinc-800 hover:border-zinc-700'}`}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleAccordion(order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 bg-gradient-to-r from-transparent hover:to-zinc-800/30"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-xl font-bold ${
                      order.status === 'pending' ? 'bg-red-500/20 text-red-500 border border-red-500/50' :
                      order.status === 'cooking' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                      order.status === 'ready' || order.status === 'delivering' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' :
                      order.status === 'cancelled' ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700' :
                      'bg-green-500/20 text-green-500 border border-green-500/50'
                    }`}>
                      {order.status === 'pending' && '🚨'}
                      {order.status === 'cooking' && '🔥'}
                      {order.status === 'ready' || order.status === 'delivering' ? (isDelivery ? '🛵' : '🛍️') : ''}
                      {order.status === 'delivered' && '✅'}
                      {order.status === 'cancelled' && '❌'}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-lg text-white uppercase">{order.client_name || 'Sin Nombre'}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">#{order.id.slice(0,5)}</span>
                      </div>
                      <div className="flex gap-3 text-xs font-medium mt-1">
                        <span className={isDelivery ? 'text-blue-400' : 'text-purple-400'}>{isDelivery ? 'A Domicilio' : 'Recogida Local'}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400">{new Date(order.created_at).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</span>
                        {order.status === 'cancelled' && <span className="text-red-500 font-bold ml-2">CANCELADO</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="text-right">
                      <span className="block text-2xl font-black text-green-400 leading-none">{order.total_amount}€</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Pagar</span>
                    </div>
                    <svg className={`w-6 h-6 text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Accordion Body (Expanded Details) */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-[#0A0A0E] p-4 sm:p-6 animate-fade-in">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Items */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Resumen de Productos</h4>
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex gap-3 text-sm border-b border-zinc-800/50 pb-2">
                              <span className="font-black text-white w-6 shrink-0">{item.quantity}x</span>
                              <div className="flex-1 text-zinc-300">
                                <span>{item.customization_details?.name || item.products?.name || 'Producto Desconocido'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Client Details & Actions */}
                      <div className="space-y-4">
                        <div className="bg-[#14141E] p-4 rounded-xl border border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Datos del Cliente</h4>
                          <p className="text-sm text-white font-bold mb-1">📞 {order.client_phone || 'Sin teléfono'}</p>
                          {order.delivery_address && (
                            <p className="text-sm text-zinc-400 leading-relaxed">
                              📍 {typeof order.delivery_address === 'string' ? order.delivery_address : JSON.stringify(order.delivery_address)}
                            </p>
                          )}
                        </div>

                        {/* Actions Buttons based on status */}
                        <div className="pt-2">
                          {order.status === 'pending' && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Aceptar y Enviar a Cocina</p>
                              <div className="flex gap-2">
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '20')} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)]">20 min</button>
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '30')} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-bold py-3 rounded-xl transition-all">30 min</button>
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '45')} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-bold py-3 rounded-xl transition-all">45 min</button>
                              </div>
                              <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full mt-2 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold py-2.5 rounded-xl transition-colors">Rechazar Pedido (Cancelar)</button>
                            </div>
                          )}

                          {order.status === 'cooking' && (
                            <div className="flex gap-3">
                              <button onClick={() => updateOrderStatus(order.id, isDelivery ? 'delivering' : 'ready')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                                Marcar como {isDelivery ? 'EN REPARTO' : 'LISTO PARA RECOGER'}
                              </button>
                            </div>
                          )}

                          {(order.status === 'delivering' || order.status === 'ready') && (
                            <div className="flex gap-3">
                              <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="flex-1 bg-zinc-800 hover:bg-green-600 text-white text-sm font-bold py-3.5 rounded-xl transition-all">
                                Finalizar Pedido (Entregado)
                              </button>
                            </div>
                          )}
                          
                          {(order.status === 'delivered' || order.status === 'cancelled') && (
                            <p className="text-center text-zinc-500 font-bold text-sm uppercase">Este pedido ya está cerrado.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
        
      </div>
    </div>
  );
}
