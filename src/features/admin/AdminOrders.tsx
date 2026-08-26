import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import TicketPrinter from '../../components/TicketPrinter';
import { sendToNetworkPrinter } from '../../utils/printerService';
import { useI18nStore } from '../../store/i18nStore';
import DOMPurify from 'dompurify';
import { formatAddress } from '../../utils/addressUtils';
import { useAdminUiStore } from '../../store/adminUiStore';

export default function AdminOrders() {
  const { startEditingOrder } = useAdminUiStore();
  const { t, tDynamic } = useI18nStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking' | 'ready' | 'delivered' | 'mesas'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [silencedCount, setSilencedCount] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [isAudioArmed, setIsAudioArmed] = useState<boolean>(
    (window as any).isAudioUnlocked || localStorage.getItem('nestor_audio_armed') === 'true' || false
  );
  const [isOpeningAlarm, setIsOpeningAlarm] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchOrders();

    // Setup audio (fuerte y ruidoso)
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
    audioRef.current.loop = true; 
    
    // Realtime subscription
    const channel = supabase.channel('realtime_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        console.log('Nuevo pedido recibido.'); // No logueamos el payload para evitar exponer PII
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        fetchOrders();
      })
      .subscribe();

    // Opening time interval
    const interval = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      
      // Mapeo simple de horas de apertura basado en tu timeUtils
      const hoursMap: Record<number, string | null> = {
        0: '20:00', 1: null, 2: null, 3: '20:30', 4: '20:00', 5: '20:00', 6: '20:00'
      };
      
      const openTime = hoursMap[day];
      if (openTime) {
        const [openHour, openMin] = openTime.split(':').map(Number);
        if (now.getHours() === openHour && now.getMinutes() === openMin) {
          setIsOpeningAlarm(true);
        }
      }
    }, 60000); // Revisa cada minuto

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
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

  const armAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        setIsAudioArmed(true);
        (window as any).isAudioUnlocked = true;
        localStorage.setItem('nestor_audio_armed', 'true');
      }).catch(e => console.log('Armado bloqueado', e));
    }
  };

  const handleSilence = () => {
    stopAudio();
    setIsOpeningAlarm(false);
    // Guardamos cuántos pendientes hay actualmente para no volver a sonar hasta que llegue uno nuevo
    setSilencedCount(orders.filter(o => o.status === 'pending').length);
  };

  const handlePrint = async (order: any) => {
    const success1 = await sendToNetworkPrinter(order);
    const success2 = await sendToNetworkPrinter(order);
    
    if (!success1 && !success2) {
      setPrintingOrder(order);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const updateOrderStatus = async (id: string, status: string, estimatedTime?: string) => {
    stopAudio();
    
    const updateData: any = { status };
    let newEstimatedReadyAt = null;
    if (estimatedTime) {
      newEstimatedReadyAt = new Date(Date.now() + parseInt(estimatedTime) * 60000).toISOString();
      updateData.estimated_ready_at = newEstimatedReadyAt;
    }
    
    await supabase.from('orders').update(updateData).eq('id', id);
    
    if (status === 'cooking') {
      let orderToPrint = orders.find(o => o.id === id);
      
      // Asegurarnos de que los order_items existan, ya que el realtime a veces no los trae
      if (orderToPrint && (!orderToPrint.order_items || orderToPrint.order_items.length === 0)) {
        const { data } = await supabase
          .from('orders')
          .select('*, order_items(*, products(name))')
          .eq('id', id)
          .single();
        if (data) orderToPrint = data;
      }
      
      if (orderToPrint) {
        // Inyectar el tiempo estimado manualmente antes de que React actualice
        if (newEstimatedReadyAt) {
          orderToPrint = { ...orderToPrint, estimated_ready_at: newEstimatedReadyAt };
        }
        await handlePrint(orderToPrint);
      }
    }

    setExpandedOrderId(null); // Collapse when moving
    fetchOrders();
  };

  // Calculate the start of the current "working day" (05:00 AM cutoff)
  const getWorkingDayStart = () => {
    const now = new Date();
    if (now.getHours() < 5) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(5, 0, 0, 0);
    return now.getTime();
  };

  const workingDayStart = getWorkingDayStart();

  // Derived filtered arrays
  const pending = orders.filter(o => o.status === 'pending' && o.delivery_method !== 'local');
  const cooking = orders.filter(o => o.status === 'cooking' && o.delivery_method !== 'local');
  const ready = orders.filter(o => (o.status === 'ready' || o.status === 'delivering') && o.delivery_method !== 'local');
  const mesas = orders.filter(o => o.delivery_method === 'local' && o.status !== 'delivered' && o.status !== 'cancelled');
  
  const delivered = orders.filter(o => {
    if (o.status !== 'delivered' && o.status !== 'cancelled') return false;
    return new Date(o.created_at).getTime() >= workingDayStart;
  });

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending': return pending;
      case 'cooking': return cooking;
      case 'ready': return ready;
      case 'delivered': return delivered;
      case 'mesas': return mesas;
    }
  };

  const currentList = getFilteredOrders();

  const [mesaToPay, setMesaToPay] = useState<string | null>(null);

  const handleCobrarMesa = async (id: string, method: string) => {
    await supabase.from('orders').update({ 
      status: 'delivered', 
      payment_method: method 
    }).eq('id', id);
    setMesaToPay(null);
    setExpandedOrderId(null);
    fetchOrders();
  };

  const toggleAccordion = (id: string) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0E] relative">
      {!isAudioArmed && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-orange-500/50">
            <span className="text-4xl">🔔</span>
          </div>
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-wider mb-3">{t('reception_blocked')}</h2>
          <p className="text-gray-400 max-w-md mb-8">{t('browser_security_message')}</p>
          <button 
            onClick={armAudio}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-10 rounded-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-transform hover:scale-105"
          >
            {t('activate_alarm')}
          </button>
        </div>
      )}

      {isOpeningAlarm && (
        <div className="absolute inset-x-0 top-0 z-40 bg-red-600 text-white p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⏰</span>
            <div>
              <h3 className="font-display font-black uppercase text-xl">{t('opening_time_title')}</h3>
              <p className="font-medium text-sm">{t('opening_time_subtitle')}</p>
            </div>
          </div>
          <button onClick={handleSilence} className="mt-3 sm:mt-0 px-6 py-2 bg-black text-white rounded-xl font-bold uppercase hover:bg-zinc-900 border border-red-500/50">
            {t('silence_alarm')}
          </button>
        </div>
      )}
      
      {/* Header and Controls */}
      <div className="p-4 sm:p-6 border-b border-zinc-800 bg-[#14141E] z-10 shadow-md flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wide flex items-center gap-2">
          {t('orders_manager_title')} <span className="text-green-500">{t('orders')}</span>
        </h2>
        {pending.length > silencedCount && (
          <button 
            onClick={handleSilence}
            className="px-4 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg text-sm font-bold uppercase animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.3)]"
          >
            {t('silence_alarm')} ({pending.length - silencedCount})
          </button>
        )}
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800 bg-[#14141E] px-4 pt-2">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          {t('new')} ({pending.length})
        </button>
        <button 
          onClick={() => setActiveTab('cooking')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'cooking' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          {t('cooking')} ({cooking.length})
        </button>
        <button 
          onClick={() => setActiveTab('ready')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'ready' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          {t('delivery_ready')} ({ready.length})
        </button>
        <button 
          onClick={() => setActiveTab('mesas')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'mesas' ? 'border-orange-500 text-orange-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          🍴 Mesas ({mesas.length})
        </button>
        <button 
          onClick={() => setActiveTab('delivered')}
          className={`px-5 py-3 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'delivered' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          {t('completed')} ({delivered.length})
        </button>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar space-y-4">
        
        {currentList.length === 0 ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <span className="text-4xl block mb-4">🍽️</span>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">{t('no_orders_section')}</p>
          </div>
        ) : (
          currentList.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const isDelivery = order.delivery_method === 'delivery';
            const isTPV = order.order_items?.[0]?.customization_details?.is_tpv_order === true;

            return (
              <div 
                key={order.id} 
                className={`bg-[#14141E] border rounded-2xl overflow-hidden transition-all duration-300 ${
                  order.status === 'pending' ? 'border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse' : 
                  isTPV ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
                  isExpanded ? 'border-zinc-500 shadow-xl' : 'border-zinc-800 hover:border-zinc-700'
                }`}
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
                      {order.delivery_method === 'local' && order.status !== 'delivered' && order.status !== 'cancelled' && '🍴'}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-lg text-white uppercase">{order.client_name || t('no_name')}</span>
                        {isTPV && (
                          <span className="bg-blue-600/20 text-blue-400 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest border border-blue-500/30 ml-2">
                            TPV
                          </span>
                        )}
                        {order.payment_status === 'FAILED' && (
                          <span className="bg-red-600/20 text-red-500 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest border border-red-500/30 ml-2 animate-pulse">
                            PAGO FALLIDO
                          </span>
                        )}
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">#{order.id.slice(0,5)}</span>
                      </div>
                      <div className="flex gap-3 text-xs font-medium mt-1">
                        <span className={isDelivery ? 'text-blue-400' : (order.delivery_method === 'local' ? 'text-orange-400' : 'text-purple-400')}>
                          {isDelivery ? t('delivery_method_home') : (order.delivery_method === 'local' ? 'Mesa / Local' : t('delivery_method_pickup'))}
                        </span>
                        <span className="text-zinc-400">{new Date(order.created_at).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</span>
                        {order.discount_applied > 0 && <span className="text-green-500 font-bold ml-2">🎫 -{order.discount_applied}€ ({t('vip')})</span>}
                        {order.status === 'cancelled' && <span className="text-red-500 font-bold ml-2">{t('cancelled')}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="text-right">
                      <span className="block text-2xl font-black text-green-400 leading-none">{order.total_amount}€</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t('total_amount')}</span>
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
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{t('product_summary')}</h4>
                        <div className="space-y-3 pl-2 sm:pl-4">
                          {order.order_items?.map((item: any, index: number) => {
                            const orderTime = new Date(order.created_at).getTime();
                            const itemTime = item.created_at ? new Date(item.created_at).getTime() : orderTime;
                            const isNewAddition = (itemTime - orderTime) > 60000;

                            return (
                            <div key={index} className={`flex items-start gap-4 ${isNewAddition ? 'bg-green-500/10 border-l-2 border-green-500 p-2 rounded-r-lg' : ''}`}>
                              <span className="font-black text-white whitespace-nowrap">{item.quantity}x</span>
                              <div className="flex-1 text-zinc-300">
                                <span>{item.customization_details?.name ? tDynamic(item.customization_details.name) : (item.products?.name ? tDynamic(item.products.name) : t('unknown_product'))}</span>
                                {isNewAddition && <span className="ml-2 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Nuevo</span>}
                                {item.customization_details?.notes && (
                                  <p 
                                    className="text-xs text-orange-400 mt-1 font-bold"
                                    dangerouslySetInnerHTML={{ 
                                      __html: DOMPurify.sanitize(`📝 ${t('notes')}: ${item.customization_details.notes}`)
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {order.discount_applied > 0 && (
                            <div className="flex justify-between text-sm border-t border-zinc-800/50 pt-2 mt-2">
                              <span className="font-bold text-green-400">{t('vip_discount_applied')}:</span>
                              <span className="font-bold text-green-400">-{order.discount_applied}€</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Client Details & Actions */}
                      <div className="space-y-4">
                        <div className="bg-[#14141E] p-4 rounded-xl border border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{t('client_details')}</h4>
                          <p className="text-sm text-white font-bold mb-1">📱 {order.client_phone || t('no_phone')}</p>
                          {order.delivery_address && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              📍 {formatAddress(order.delivery_address as string)}
                            </p>
                          )}
                        </div>

{/* Print Button */}
                        <div className="pb-4 mb-4 border-b border-zinc-800/80 flex gap-2">
                          <button 
                            onClick={() => handlePrint(order)}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <span className="text-xl">🖨️</span> Imprimir
                          </button>
                          
                          {(order.status === 'pending' || order.status === 'cooking') && (
                            <button 
                              onClick={() => startEditingOrder(order)}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                            >
                              <span className="text-xl">✏️</span> Editar / Añadir
                            </button>
                          )}
                        </div>

                        {/* Actions Buttons based on status */}
                        <div className="pt-2">
                          {order.status === 'pending' && order.delivery_method !== 'local' && (
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

                          {order.status === 'cooking' && order.delivery_method !== 'local' && (
                            <div className="flex gap-3">
                              <button onClick={() => updateOrderStatus(order.id, isDelivery ? 'delivering' : 'ready')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                                {t('mark_as')} {isDelivery ? t('status_delivering_title').toUpperCase() : t('status_ready_pickup_title').toUpperCase()}
                              </button>
                            </div>
                          )}

                          {(order.status === 'delivering' || order.status === 'ready') && order.delivery_method !== 'local' && (
                            <div className="flex gap-3">
                              <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="flex-1 bg-zinc-800 hover:bg-green-600 text-white text-sm font-bold py-3.5 rounded-xl transition-all">
                                Finalizar Pedido (Entregado)
                              </button>
                            </div>
                          )}

                          {order.delivery_method === 'local' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                              {mesaToPay === order.id ? (
                                <div className="space-y-3">
                                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">¿Cómo pagó el cliente?</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleCobrarMesa(order.id, 'cash')} className="flex-1 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-500/50 text-sm font-bold py-3 rounded-xl transition-all">💵 Efectivo</button>
                                    <button onClick={() => handleCobrarMesa(order.id, 'tpv')} className="flex-1 bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/50 text-sm font-bold py-3 rounded-xl transition-all">💳 Tarjeta (TPV)</button>
                                  </div>
                                  <button onClick={() => setMesaToPay(null)} className="w-full text-xs text-zinc-500 hover:text-white mt-2">Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={() => setMesaToPay(order.id)} className="w-full bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                                  💸 Cobrar y Finalizar Mesa
                                </button>
                              )}
                            </div>
                          )}
                          
                          {(order.status === 'delivered' || order.status === 'cancelled') && (
                            <p className="text-center text-zinc-500 font-bold text-sm uppercase mt-4">Este pedido ya está cerrado.</p>
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
      
      
      
      {/* Componente invisible para impresión térmica */}
      {printingOrder && <TicketPrinter order={printingOrder} />}
    </div>
  );
}
