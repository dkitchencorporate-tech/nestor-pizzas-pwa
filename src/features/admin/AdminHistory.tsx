import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18nStore } from '../../store/i18nStore';
import { formatAddress } from '../../utils/addressUtils';

type DateFilter = 'today' | 'yesterday' | '7days' | '30days';

export default function AdminHistory() {
  const { t } = useI18nStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [dateFilter]);

  const getWorkingDayRange = (filter: DateFilter) => {
    const now = new Date();
    
    // Si estamos antes de las 5 AM, el "hoy" de negocio empezó ayer a las 5 AM
    const isLateNight = now.getHours() < 5;
    
    const start = new Date(now);
    const end = new Date(now);

    switch (filter) {
      case 'today':
        if (isLateNight) start.setDate(start.getDate() - 1);
        start.setHours(5, 0, 0, 0);
        
        end.setTime(start.getTime() + 24 * 60 * 60 * 1000); // 5 AM of next day
        break;
      case 'yesterday':
        if (isLateNight) start.setDate(start.getDate() - 2);
        else start.setDate(start.getDate() - 1);
        start.setHours(5, 0, 0, 0);
        
        end.setTime(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '7days':
        if (isLateNight) end.setDate(end.getDate() - 1);
        end.setHours(5, 0, 0, 0);
        end.setTime(end.getTime() + 24 * 60 * 60 * 1000); // end of today's shift
        
        start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        if (isLateNight) end.setDate(end.getDate() - 1);
        end.setHours(5, 0, 0, 0);
        end.setTime(end.getTime() + 24 * 60 * 60 * 1000); // end of today's shift
        
        start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchHistory = async () => {
    setLoading(true);
    setExpandedOrderId(null);
    
    const { start, end } = getWorkingDayRange(dateFilter);

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false });
      
    if (data) setOrders(data);
    setLoading(false);
  };

  const toggleAccordion = (id: string) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  const downloadCSV = () => {
    if (orders.length === 0) {
      alert(t('no_orders_to_export'));
      return;
    }

    const headers = [t('order_id'), t('date'), t('time'), t('type'), t('status'), t('total_euros')];
    
    const rows = orders.map(order => {
      const date = new Date(order.created_at);
      const dateStr = date.toLocaleDateString('es-ES');
      const timeStr = date.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
      const typeStr = order.delivery_method === 'delivery' ? 'Domicilio' : 'Local';
      const statusStr = order.status === 'delivered' ? 'Completado' : 'Cancelado';
      const total = order.total_amount;
      
      return `"${order.id.slice(0,8)}","${dateStr}","${timeStr}","${typeStr}","${statusStr}","${total}"`;
    });

    // Add BOM for Excel UTF-8 recognition
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers.join(',') + "\n" + rows.join('\n');
    
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `informe_nestor_pizzas_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0E] text-white overflow-hidden print:bg-white print:text-black">
      
      {/* Header and Controls */}
      <div className="p-4 sm:p-6 border-b border-zinc-800 bg-[#14141E] z-10 shadow-md flex items-center justify-between print:hidden">
        <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wide flex items-center gap-2">
          Historial de <span className="text-zinc-500">Pedidos</span>
        </h2>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold uppercase hover:bg-blue-600/30 transition-colors flex items-center gap-2"
            >
              📊 Exportar
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <button onClick={() => { downloadCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm font-medium text-white border-b border-zinc-800">
                    📥 Descargar Excel (CSV)
                  </button>
                  <button onClick={() => { window.print(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm font-medium text-white">
                    🖨️ Imprimir Informe (PDF)
                  </button>
                </div>
              </>
            )}
          </div>
          <button 
            onClick={fetchHistory}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800 bg-[#14141E] px-4 pt-2 print:hidden">
        <button 
          onClick={() => setDateFilter('today')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${dateFilter === 'today' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Hoy
        </button>
        <button 
          onClick={() => setDateFilter('yesterday')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${dateFilter === 'yesterday' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Ayer
        </button>
        <button 
          onClick={() => setDateFilter('7days')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${dateFilter === '7days' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Últimos 7 Días
        </button>
        <button 
          onClick={() => setDateFilter('30days')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${dateFilter === '30days' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Último Mes
        </button>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar space-y-4 print:hidden">
        
        {loading ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Cargando Historial...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <span className="text-4xl block mb-4">🗄️</span>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No hay pedidos en este rango</p>
          </div>
        ) : (
          orders.map(order => {
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
                      order.status === 'cancelled' ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700' :
                      'bg-green-500/20 text-green-500 border border-green-500/50'
                    }`}>
                      {order.status === 'delivered' && '✅'}
                      {order.status === 'cancelled' && '❌'}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-lg text-white uppercase">{order.client_name || t('no_name')}</span>
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
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Pagado</span>
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
                            <p className="text-sm text-zinc-400 mt-1">
                              📍 {formatAddress(order.delivery_address as any)}
                            </p>
                          )}
                        </div>

                        <div className="pt-2">
                          <p className="text-center text-zinc-500 font-bold text-sm uppercase">Este pedido ya está cerrado y no se puede modificar.</p>
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

      {/* Printable Report Section (Only visible when printing) */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen w-full">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-4xl font-black uppercase mb-1">Néstor Pizzas</h1>
          <h2 className="text-2xl text-gray-600 font-bold uppercase tracking-widest">Informe Contable y Cierre de Caja</h2>
          <p className="text-sm mt-2 text-gray-500 font-mono">
            RANGO: {dateFilter.toUpperCase()} | GENERADO: {new Date().toLocaleString('es-ES')}
          </p>
        </div>

        {(() => {
          // Filtrar solo entregados
          const validOrders = orders.filter(o => o.status === 'delivered');
          
          // Agrupaciones
          const deliveryOrders = validOrders.filter(o => o.delivery_method === 'delivery');
          const pickupOrders = validOrders.filter(o => o.delivery_method === 'pickup');
          const mesaOrders = validOrders.filter(o => o.delivery_method === 'local');

          // Función de cálculo
          const calc = (list: any[]) => {
            const total = list.reduce((sum, o) => sum + Number(o.total_amount), 0);
            const cash = list.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + Number(o.total_amount), 0);
            const tpv = list.filter(o => o.payment_method === 'tpv').reduce((sum, o) => sum + Number(o.total_amount), 0);
            const online = list.filter(o => o.payment_method === 'online' || !o.payment_method).reduce((sum, o) => sum + Number(o.total_amount), 0);
            return { total, cash, tpv, online };
          };

          const deliveryMath = calc(deliveryOrders);
          const pickupMath = calc(pickupOrders);
          const mesaMath = calc(mesaOrders);
          const totalMath = calc(validOrders);

          return (
            <div className="space-y-8">
              {/* Resumen General */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 border-2 border-black rounded-xl text-center bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Pedidos</p>
                  <p className="text-3xl font-black">{validOrders.length}</p>
                </div>
                <div className="p-4 border-2 border-black rounded-xl text-center bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Facturación Total</p>
                  <p className="text-3xl font-black">{totalMath.total.toFixed(2)}€</p>
                </div>
                <div className="p-4 border-2 border-black rounded-xl text-center bg-green-100 border-green-800">
                  <p className="text-xs font-bold text-green-800 uppercase tracking-widest">Total Efectivo (Caja)</p>
                  <p className="text-3xl font-black text-green-700">{totalMath.cash.toFixed(2)}€</p>
                </div>
                <div className="p-4 border-2 border-black rounded-xl text-center bg-blue-100 border-blue-800">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Total TPV + Online</p>
                  <p className="text-3xl font-black text-blue-700">{(totalMath.tpv + totalMath.online).toFixed(2)}€</p>
                </div>
              </div>

              {/* Desglose por Tipo */}
              <div className="grid grid-cols-3 gap-6">
                
                {/* DOMICILIO */}
                <div className="border border-gray-300 rounded-xl p-5 shadow-sm">
                  <h3 className="text-lg font-black uppercase border-b border-gray-300 pb-2 mb-3">🛵 A Domicilio</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-bold">Pedidos:</span> <span>{deliveryOrders.length}</span></div>
                    <div className="flex justify-between"><span className="font-bold">App/Online:</span> <span>{deliveryMath.online.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span className="font-bold">TPV (Tarjeta):</span> <span>{deliveryMath.tpv.toFixed(2)}€</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 mt-2 text-green-700"><span className="font-bold uppercase">Debe traer el repartidor:</span> <span className="font-black text-base">{deliveryMath.cash.toFixed(2)}€</span></div>
                  </div>
                  <div className="mt-4 bg-gray-100 p-2 rounded text-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Facturación Domicilio</span>
                    <p className="text-xl font-black">{deliveryMath.total.toFixed(2)}€</p>
                  </div>
                </div>

                {/* RECOGIDA */}
                <div className="border border-gray-300 rounded-xl p-5 shadow-sm">
                  <h3 className="text-lg font-black uppercase border-b border-gray-300 pb-2 mb-3">🛍️ Recogida</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-bold">Pedidos:</span> <span>{pickupOrders.length}</span></div>
                    <div className="flex justify-between"><span className="font-bold">App/Online:</span> <span>{pickupMath.online.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span className="font-bold">TPV (Tarjeta):</span> <span>{pickupMath.tpv.toFixed(2)}€</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 mt-2 text-green-700"><span className="font-bold uppercase">Efectivo Recibido:</span> <span className="font-black text-base">{pickupMath.cash.toFixed(2)}€</span></div>
                  </div>
                  <div className="mt-4 bg-gray-100 p-2 rounded text-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Facturación Recogida</span>
                    <p className="text-xl font-black">{pickupMath.total.toFixed(2)}€</p>
                  </div>
                </div>

                {/* MESAS */}
                <div className="border border-gray-300 rounded-xl p-5 shadow-sm">
                  <h3 className="text-lg font-black uppercase border-b border-gray-300 pb-2 mb-3">🍴 Mesas (Local)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-bold">Pedidos:</span> <span>{mesaOrders.length}</span></div>
                    <div className="flex justify-between text-gray-400"><span className="font-bold">App/Online:</span> <span>N/A</span></div>
                    <div className="flex justify-between"><span className="font-bold">TPV (Tarjeta):</span> <span>{mesaMath.tpv.toFixed(2)}€</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 mt-2 text-green-700"><span className="font-bold uppercase">Efectivo Recibido:</span> <span className="font-black text-base">{mesaMath.cash.toFixed(2)}€</span></div>
                  </div>
                  <div className="mt-4 bg-gray-100 p-2 rounded text-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Facturación Local</span>
                    <p className="text-xl font-black">{mesaMath.total.toFixed(2)}€</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
        
        <div className="mt-12 pt-4 border-t-2 border-black text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
          <p>Documento oficial generado automáticamente por el TPV de Néstor Pizzas Enterprise.</p>
          <p>Los datos de carácter personal de los clientes han sido excluidos conforme a la RGPD.</p>
        </div>
      </div>

    </div>
  );
}
