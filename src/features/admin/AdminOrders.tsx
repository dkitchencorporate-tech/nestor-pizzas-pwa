import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initial fetch (mocking for now since tables might be empty)
    fetchOrders();

    // Setup audio
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audioRef.current.loop = true; // Sonido persistente
    
    // Realtime subscription
    const channel = supabase.channel('realtime_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        console.log('Nuevo pedido recibido!', payload);
        // Tocar sonido
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play error (browser policy):', e));
        }
        fetchOrders(); // reload
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
      .limit(50);
      
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
    fetchOrders();
  };

  // Group by status
  const pending = orders.filter(o => o.status === 'pending');
  const cooking = orders.filter(o => o.status === 'cooking');
  const ready = orders.filter(o => o.status === 'ready' || o.status === 'delivering');
  const delivered = orders.filter(o => o.status === 'delivered');

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide">
          Dashboard <span className="text-green-500">Cocina</span>
        </h2>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <button 
              onClick={stopAudio}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg text-sm font-bold uppercase animate-pulse"
            >
              Silenciar Alarma
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        
        {/* Column: PENDING */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-red-500/10 border-b border-red-500/20">
            <h3 className="font-display font-black text-red-500 uppercase flex justify-between">
              Nuevos Entrantes <span>{pending.length}</span>
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 no-scrollbar">
            {pending.map(order => (
              <div key={order.id} className="bg-[#1A1A24] border border-red-500/50 rounded-xl p-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</span>
                    <h4 className="font-bold text-white">1x Pedido Nuevo</h4>
                  </div>
                  <span className="text-green-400 font-bold">{order.total_amount}€</span>
                </div>
                
                {/* Items */}
                <div className="space-y-1 mb-4 border-t border-zinc-700/50 pt-3">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="text-sm text-gray-300">
                      <span className="font-bold text-white">{item.quantity}x</span> {item.customization_details?.name || item.products?.name || 'Producto'}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-2 mt-4">
                  <div className="flex gap-2">
                    <button onClick={() => updateOrderStatus(order.id, 'cooking', '20')} className="flex-1 bg-zinc-800 hover:bg-green-600 text-xs font-bold py-2 rounded-lg transition-colors">20m</button>
                    <button onClick={() => updateOrderStatus(order.id, 'cooking', '30')} className="flex-1 bg-zinc-800 hover:bg-green-600 text-xs font-bold py-2 rounded-lg transition-colors">30m</button>
                    <button onClick={() => updateOrderStatus(order.id, 'cooking', '45')} className="flex-1 bg-zinc-800 hover:bg-green-600 text-xs font-bold py-2 rounded-lg transition-colors">45m</button>
                  </div>
                  <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold py-2 rounded-lg transition-colors">Rechazar Pedido</button>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="text-zinc-600 text-sm text-center py-10 font-bold">Sin pedidos nuevos</p>}
          </div>
        </div>

        {/* Column: COOKING */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
            <h3 className="font-display font-black text-yellow-500 uppercase flex justify-between">
              En Preparación <span>{cooking.length}</span>
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 no-scrollbar">
            {cooking.map(order => (
              <div key={order.id} className="bg-[#1A1A24] border border-zinc-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</span>
                  <span className="text-yellow-400 text-xs font-bold bg-yellow-500/10 px-2 py-1 rounded">Cocinando</span>
                </div>
                <div className="space-y-1 mb-4">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="text-sm text-gray-300">
                      <span className="font-bold text-white">{item.quantity}x</span> {item.customization_details?.name || item.products?.name || 'Producto'}
                    </div>
                  ))}
                </div>
                {order.delivery_method === 'delivery' ? (
                  <button onClick={() => updateOrderStatus(order.id, 'delivering')} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black uppercase text-xs py-2.5 rounded-lg transition-colors">
                    En Reparto
                  </button>
                ) : (
                  <button onClick={() => updateOrderStatus(order.id, 'ready')} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs py-2.5 rounded-lg transition-colors">
                    Marcar como Listo
                  </button>
                )}
                <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full mt-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold py-2 rounded-lg transition-colors">
                  Cancelar Pedido
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column: READY */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-green-500/10 border-b border-green-500/20">
            <h3 className="font-display font-black text-green-500 uppercase flex justify-between">
              Listo / Esperando <span>{ready.length}</span>
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 no-scrollbar">
            {ready.map(order => (
              <div key={order.id} className="bg-[#1A1A24] border border-green-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</span>
                </div>
                <div className="space-y-1 mb-4 text-sm text-gray-300">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id}><span className="font-bold text-white">{item.quantity}x</span> {item.customization_details?.name || item.products?.name || 'Producto'}</div>
                  ))}
                </div>
                <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="w-full bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Entregado
                </button>
                <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full mt-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold py-2 rounded-lg transition-colors">
                  Cancelar Pedido
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
