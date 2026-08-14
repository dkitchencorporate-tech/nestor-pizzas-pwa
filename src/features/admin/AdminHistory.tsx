import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (data) setOrders(data);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide">
          Historial de <span className="text-zinc-500">Pedidos</span>
        </h2>
        <button 
          onClick={fetchHistory}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="flex-1 bg-[#14141E] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-4 space-y-2 no-scrollbar">
          {loading ? (
            <p className="text-center text-zinc-500 py-10 font-bold">Cargando historial...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-zinc-500 py-10 font-bold">No hay pedidos en el historial.</p>
          ) : (
            <div className="w-full text-left border-collapse">
              {orders.map(order => (
                <div key={order.id} className="bg-[#1A1A24] border border-zinc-800 rounded-xl p-4 mb-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] text-gray-400 font-mono bg-black px-2 py-1 rounded">ID: {order.id.slice(0,8)}</span>
                      <span className="text-xs text-gray-400 font-medium">{formatDate(order.created_at)}</span>
                      {order.status === 'delivered' ? (
                        <span className="text-[10px] font-bold uppercase text-green-400 bg-green-500/10 px-2 py-1 rounded">Completado</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-1 rounded">Cancelado</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      <span className="font-bold text-white">{order.client_name || 'Cliente'}</span> • {order.client_phone || 'Sin teléfono'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {order.order_items?.map((item: any) => `${item.quantity}x ${item.customization_details?.name || item.products?.name}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white block">{order.total_amount}€</span>
                    <span className="text-xs text-gray-500 uppercase">{order.delivery_method === 'delivery' ? 'A Domicilio' : 'Recogida'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
