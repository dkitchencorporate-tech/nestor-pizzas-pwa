import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18nStore } from '../../store/i18nStore';
import { formatAddress } from '../../utils/addressUtils';
import { useAuthStore } from '../../store/authStore';

type DateFilter = 'today' | 'yesterday' | '7days' | '30days' | 'custom';
type ServiceFilter = 'all' | 'delivery' | 'pickup' | 'local';
type PaymentFilter = 'all' | 'cash' | 'tpv' | 'online';
type StatusFilter = 'all' | 'delivered' | 'cancelled';

const MAX_CUSTOM_DAYS = 90; // Límite máximo de 3 meses para preservar integridad contable

export default function AdminHistory() {
  const { t } = useI18nStore();
  const { logout } = useAuthStore();
  
  // Data & Loading States
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  
  // Custom Date Range (Desde - Hasta)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

  // Multi-criteria in-memory filters
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('delivered');
  
  // UI & Modals States
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showDailyCloseModal, setShowDailyCloseModal] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [dateFilter, customStartDate, customEndDate]);

  const validateAndCalculateCustomRange = (startStr: string, endStr: string) => {
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);
    
    let start = new Date(sY, sM - 1, sD, 5, 0, 0, 0);
    let end = new Date(eY, eM - 1, eD, 5, 0, 0, 0);
    
    // Ensure start is before end
    if (start > end) {
      end = new Date(start);
    }
    
    // Check 90 days (3 months) limit
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > MAX_CUSTOM_DAYS) {
      end = new Date(start.getTime() + MAX_CUSTOM_DAYS * 24 * 60 * 60 * 1000);
      setRangeWarning(`El rango supera los 3 meses. Se ha ajustado automáticamente al límite de ${MAX_CUSTOM_DAYS} días.`);
    } else {
      setRangeWarning(null);
    }
    
    // Add 24h to end so it covers the entire closing day until 5:00 AM of next day
    const endCover = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    
    return { start: start.toISOString(), end: endCover.toISOString() };
  };

  const getWorkingDayRange = (filter: DateFilter) => {
    const now = new Date();
    const isLateNight = now.getHours() < 5;
    
    let start = new Date(now);
    let end = new Date(now);

    switch (filter) {
      case 'today':
        if (isLateNight) start.setDate(start.getDate() - 1);
        start.setHours(5, 0, 0, 0);
        end.setTime(start.getTime() + 24 * 60 * 60 * 1000);
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
        end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
        start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        if (isLateNight) end.setDate(end.getDate() - 1);
        end.setHours(5, 0, 0, 0);
        end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
        start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        return validateAndCalculateCustomRange(customStartDate, customEndDate);
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
      
    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  // Filtered Orders in Memory (Multi-criteria real-time for screen view)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Service filter
      if (serviceFilter !== 'all') {
        if (serviceFilter === 'delivery' && order.delivery_method !== 'delivery') return false;
        if (serviceFilter === 'pickup' && order.delivery_method !== 'pickup') return false;
        if (serviceFilter === 'local' && order.delivery_method !== 'local') return false;
      }

      // Payment filter
      if (paymentFilter !== 'all') {
        const pMethod = order.payment_method || 'cash';
        if (paymentFilter === 'cash' && pMethod !== 'cash') return false;
        if (paymentFilter === 'tpv' && pMethod !== 'tpv' && pMethod !== 'physical' && pMethod !== 'card_delivery') return false;
        if (paymentFilter === 'online' && pMethod !== 'online' && pMethod !== 'sumup_online') return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false;
      }

      return true;
    });
  }, [orders, serviceFilter, paymentFilter, statusFilter]);

  // Real-time Financial Calculations (Atomic Math)
  const stats = useMemo(() => {
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Cash delivered orders (Rider Cash to be liquidated!)
    const cashDeliveryOrders = deliveredOrders.filter(o => 
      o.delivery_method === 'delivery' && (o.payment_method === 'cash' || !o.payment_method)
    );
    const cashDeliveryTotal = cashDeliveryOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Cash in Local / Counter / Tables
    const cashLocalOrders = deliveredOrders.filter(o => 
      o.delivery_method !== 'delivery' && (o.payment_method === 'cash' || !o.payment_method)
    );
    const cashLocalTotal = cashLocalOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Total Cash
    const totalCash = cashDeliveryTotal + cashLocalTotal;

    // Total TPV / Card
    const tpvOrders = deliveredOrders.filter(o => 
      o.payment_method === 'tpv' || o.payment_method === 'physical' || o.payment_method === 'card_delivery'
    );
    const totalTpv = tpvOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Total Online / App / SumUp
    const onlineOrders = deliveredOrders.filter(o => 
      o.payment_method === 'online' || o.payment_method === 'sumup_online'
    );
    const totalOnline = onlineOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Segregated Channels stats for fiscal report
    const deliveryOrders = deliveredOrders.filter(o => o.delivery_method === 'delivery');
    const deliveryTotalRevenue = deliveryOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const pickupOrders = deliveredOrders.filter(o => o.delivery_method === 'pickup');
    const pickupTotalRevenue = pickupOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const localDiningOrders = deliveredOrders.filter(o => o.delivery_method === 'local');
    const localDiningTotalRevenue = localDiningOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    return {
      totalRevenue,
      cashDeliveryTotal,
      cashDeliveryCount: cashDeliveryOrders.length,
      cashLocalTotal,
      totalCash,
      totalTpv,
      totalOnline,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      totalCount: filteredOrders.length,
      // Fiscal breakdowns
      deliveryOrders,
      deliveryTotalRevenue,
      pickupOrders,
      pickupTotalRevenue,
      localDiningOrders,
      localDiningTotalRevenue,
      cancelledOrdersList: cancelledOrders
    };
  }, [filteredOrders]);

  const toggleAccordion = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const triggerAuditPrint = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateFormatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const originalTitle = document.title;
    
    // Set dynamic download filename for "Guardar como PDF"
    document.title = `NESTOR_PIZZAS_INFORME_CONTABLE_${dateFormatted}`;
    
    document.body.classList.add('printing-audit-report');
    window.print();
    
    setTimeout(() => {
      document.body.classList.remove('printing-audit-report');
      document.title = originalTitle;
    }, 2000);
  };

  const handlePrintClick = () => {
    if (dateFilter === 'today') {
      setShowDailyCloseModal(true);
    } else {
      triggerAuditPrint();
    }
  };

  const handlePerformDailyClose = async () => {
    setIsClosingShift(true);
    try {
      // 1. Mark store as closed for the night until next opening schedule
      await supabase.from('app_settings').upsert({ key: 'store_closed', value: 'true' });
      
      setShowDailyCloseModal(false);
      
      // 2. Trigger printable A4 audit report with dynamic title
      triggerAuditPrint();
      
      // 3. Perform secure admin logout and reload
      setTimeout(async () => {
        await logout();
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Error closing daily shift:', err);
      setIsClosingShift(false);
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Jornada de Hoy';
      case 'yesterday': return 'Jornada de Ayer';
      case '7days': return 'Últimos 7 Días';
      case '30days': return 'Último Mes (30 Días)';
      case 'custom': return `Periodo: ${customStartDate} al ${customEndDate}`;
    }
  };

  const formatPayMethod = (method?: string) => {
    if (!method || method === 'cash') return 'Efectivo';
    if (method === 'tpv' || method === 'physical' || method === 'card_delivery') return 'Datáfono TPV';
    if (method === 'online' || method === 'sumup_online') return 'App / Online';
    return method;
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0E] text-white overflow-hidden print:bg-white print:text-black">
      
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#14141E] z-10 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wide flex items-center gap-2">
            Historial de <span className="text-green-500">Pedidos & Arqueo</span>
          </h2>
          <p className="text-xs text-zinc-400 font-medium">Auditoría contable, conciliación de repartidores y cierre de caja</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrintClick}
            className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-105"
          >
            <span>🖨️</span>
            <span>{dateFilter === 'today' ? 'Informe PDF / Cierre de Caja' : 'Descargar Informe PDF'}</span>
          </button>
          
          <button 
            onClick={fetchHistory}
            className="px-3.5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold uppercase hover:bg-zinc-700 hover:text-white transition-colors"
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      {/* Date Range Navigation Tabs */}
      <div className="flex items-center overflow-x-auto no-scrollbar border-b border-zinc-800 bg-[#101018] px-4 pt-2 gap-1 print:hidden">
        <button 
          onClick={() => setDateFilter('today')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap rounded-t-lg ${dateFilter === 'today' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          📅 Hoy
        </button>
        <button 
          onClick={() => setDateFilter('yesterday')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap rounded-t-lg ${dateFilter === 'yesterday' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          ⏪ Ayer
        </button>
        <button 
          onClick={() => setDateFilter('7days')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap rounded-t-lg ${dateFilter === '7days' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          📊 Últimos 7 Días
        </button>
        <button 
          onClick={() => setDateFilter('30days')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap rounded-t-lg ${dateFilter === '30days' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          📈 Último Mes
        </button>
        
        {/* Custom Calendar Date Range Picker (Max 90 days) */}
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b-2 rounded-t-lg transition-all ${dateFilter === 'custom' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-transparent text-zinc-500'}`}>
          <button 
            onClick={() => setDateFilter('custom')} 
            className="text-xs font-bold uppercase whitespace-nowrap"
          >
            🗓️ Rango Personalizado (Máx 3 Meses):
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Desde:</span>
            <input 
              type="date" 
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setDateFilter('custom');
              }}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-green-500"
            />
            
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Hasta:</span>
            <input 
              type="date" 
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setDateFilter('custom');
              }}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Range Warning Alert if > 90 days */}
      {rangeWarning && dateFilter === 'custom' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-xs text-amber-300 font-medium flex items-center gap-2 print:hidden">
          <span>⚠️</span>
          <span>{rangeWarning}</span>
        </div>
      )}

      {/* Multi-Criteria Interactive Filter Toolbar */}
      <div className="p-3 sm:px-6 bg-[#14141E] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 print:hidden">
        
        {/* Service Type Filter */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">Tipo:</span>
          {(['all', 'delivery', 'pickup', 'local'] as ServiceFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setServiceFilter(st)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all capitalize ${serviceFilter === st ? 'bg-green-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {st === 'all' ? 'Todos' : (st === 'delivery' ? '🛵 Domicilio' : (st === 'pickup' ? '🛍️ Recogida' : '🍽️ Mesas'))}
            </button>
          ))}
        </div>

        {/* Payment Method Filter */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">Pago:</span>
          {(['all', 'cash', 'tpv', 'online'] as PaymentFilter[]).map((pm) => (
            <button
              key={pm}
              onClick={() => setPaymentFilter(pm)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all capitalize ${paymentFilter === pm ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {pm === 'all' ? 'Todos' : (pm === 'cash' ? '💵 Efectivo' : (pm === 'tpv' ? '💳 TPV Físico' : '📱 App / Online'))}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">Estado:</span>
          {(['delivered', 'cancelled', 'all'] as StatusFilter[]).map((sf) => (
            <button
              key={sf}
              onClick={() => setStatusFilter(sf)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all capitalize ${statusFilter === sf ? (sf === 'cancelled' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-white') : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {sf === 'delivered' ? '🟢 Completados' : (sf === 'cancelled' ? '❌ Cancelados' : 'Todos')}
            </button>
          ))}
        </div>

      </div>

      {/* Real-Time Financial Summary Panel (Arqueo de Caja & Liquidación) */}
      <div className="p-4 sm:px-6 bg-[#0E0E16] border-b border-zinc-800/80 print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Card 1: EFECTIVO EN REPARTO */}
          <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">🛵 Efectivo Reparto</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">{stats.cashDeliveryCount} ped.</span>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-black text-amber-300 leading-none whitespace-nowrap">{stats.cashDeliveryTotal.toFixed(2)}€</span>
              <p className="text-[9px] text-amber-400/80 font-medium mt-1">A entregar por repartidores</p>
            </div>
          </div>

          {/* Card 2: EFECTIVO EN LOCAL */}
          <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">💵 Efectivo Local/Barra</span>
            <div className="mt-1">
              <span className="text-xl font-black text-zinc-200 leading-none whitespace-nowrap">{stats.cashLocalTotal.toFixed(2)}€</span>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Cobrado en mostrador/mesas</p>
            </div>
          </div>

          {/* Card 3: TOTAL DATAFONO TPV */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">💳 Datáfono TPV Físico</span>
            <div className="mt-1">
              <span className="text-xl font-black text-blue-300 leading-none whitespace-nowrap">{stats.totalTpv.toFixed(2)}€</span>
              <p className="text-[9px] text-blue-400/70 font-medium mt-1">Tarjetas en TPV</p>
            </div>
          </div>

          {/* Card 4: TOTAL ONLINE / APP */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">📱 App / SumUp Online</span>
            <div className="mt-1">
              <span className="text-xl font-black text-purple-300 leading-none whitespace-nowrap">{stats.totalOnline.toFixed(2)}€</span>
              <p className="text-[9px] text-purple-400/70 font-medium mt-1">Pasarela web</p>
            </div>
          </div>

          {/* Card 5: FACTURACIÓN TOTAL */}
          <div className="bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">💰 Facturación Total</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">{stats.deliveredCount} ped.</span>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-black text-emerald-400 leading-none whitespace-nowrap">{stats.totalRevenue.toFixed(2)}€</span>
              <p className="text-[9px] text-emerald-400/80 font-medium mt-1">Efectivo Total: {stats.totalCash.toFixed(2)}€</p>
            </div>
          </div>

        </div>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar space-y-3.5 print:hidden">
        
        {loading ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Cargando Registros de Historial...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
            <span className="text-4xl block mb-4">🗄️</span>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">No hay pedidos coincidentes con los filtros actuales</p>
            <p className="text-zinc-600 text-xs mt-1">Prueba a seleccionar otro rango de fechas o cambiar el método de pago</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const isDelivery = order.delivery_method === 'delivery';
            const isPickup = order.delivery_method === 'pickup';
            const isCash = order.payment_method === 'cash' || !order.payment_method;
            const isTpv = order.payment_method === 'tpv' || order.payment_method === 'physical' || order.payment_method === 'card_delivery';
            const isOnline = order.payment_method === 'online' || order.payment_method === 'sumup_online';

            return (
              <div 
                key={order.id} 
                className={`bg-[#14141E] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-green-500/80 shadow-2xl' : 'border-zinc-800 hover:border-zinc-700'}`}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleAccordion(order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 bg-gradient-to-r from-transparent hover:to-zinc-800/30"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      'bg-green-500/20 text-green-400 border border-green-500/50'
                    }`}>
                      {order.status === 'delivered' && '✅'}
                      {order.status === 'cancelled' && '❌'}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-black text-lg text-white uppercase">{order.client_name || t('no_name')}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">#{order.id.slice(0, 8)}</span>
                        
                        {/* Service Badge */}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                          isDelivery ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          (isPickup ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30')
                        }`}>
                          {isDelivery ? '🛵 Domicilio' : (isPickup ? '🛍️ Recogida' : '🍽️ Mesa Local')}
                        </span>

                        {/* Payment Method Badge */}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                          isCash ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          (isTpv ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40')
                        }`}>
                          {isCash ? '💵 Efectivo' : (isTpv ? '💳 TPV Físico' : '📱 App / Online')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 font-medium">
                        <span>🕒 {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>📅 {new Date(order.created_at).toLocaleDateString('es-ES')}</span>
                        {order.status === 'cancelled' && <span className="text-red-400 font-bold ml-2">CANCELADO</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="text-right">
                      <span className="block text-2xl font-black text-green-400 leading-none">{Number(order.total_amount || 0).toFixed(2)}€</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Importe Cobrado</span>
                    </div>
                    <svg className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-green-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-[#0A0A0E] p-4 sm:p-6 animate-fade-in">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Ordered Items Breakdown */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span>🍕</span> Desglose de Productos
                        </h4>
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex gap-3 text-sm border-b border-zinc-800/60 pb-2">
                              <span className="font-black text-green-400 w-6 shrink-0">{item.quantity}x</span>
                              <div className="flex-1 text-zinc-300">
                                <div className="font-bold text-white flex justify-between">
                                  <span>{item.customization_details?.name || item.products?.name || 'Producto'}</span>
                                  <span className="text-zinc-400 font-normal">{Number(item.unit_price || 0).toFixed(2)}€</span>
                                </div>
                                {item.customization_details?.extras && item.customization_details.extras.length > 0 && (
                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    Extras: {item.customization_details.extras.map((e: any) => typeof e === 'string' ? e : e.name).join(', ')}
                                  </p>
                                )}
                                {item.customization_details?.notes && (
                                  <p className="text-xs text-amber-400/80 italic mt-0.5">
                                    Nota: "{item.customization_details.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Client Details & Notes */}
                      <div className="space-y-4">
                        <div className="bg-[#14141E] p-4 rounded-2xl border border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span>📍</span> Información de Entrega & Cliente
                          </h4>
                          <p className="text-sm text-white font-bold mb-1">📞 {order.client_phone || 'Sin teléfono'}</p>
                          {order.delivery_address && (
                            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                              Dirección: {formatAddress(order.delivery_address as any)}
                            </p>
                          )}
                          {order.notes && (
                            <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium">
                              📝 <span className="font-bold">Instrucciones:</span> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Order Footer summary */}
                        <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-right flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-bold uppercase">Método: {isCash ? 'Efectivo en Mano' : (isTpv ? 'Datáfono TPV' : 'Pasarela Online')}</span>
                          <span className="text-sm font-black text-white">Total: {Number(order.total_amount || 0).toFixed(2)}€</span>
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

      {/* DAILY CLOSE & CASH RECONCILIATION MODAL (For Active Day HOY) */}
      {showDailyCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141E] border-2 border-green-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            
            <div className="text-center">
              <span className="text-4xl block mb-2">🔒</span>
              <h3 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wide">
                Cierre de Caja & Jornada
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Resumen contable oficial para la jornada activa de <span className="text-green-400 font-bold">HOY</span>
              </p>
            </div>

            {/* Reconciliation breakdown */}
            <div className="bg-[#0A0A0E] border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-zinc-800/80 pb-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">🛵 Efectivo Repartidores:</span>
                <span className="font-black text-amber-300 text-base">{stats.cashDeliveryTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 font-bold">💵 Efectivo Mostrador/Local:</span>
                <span className="font-black text-zinc-200">{stats.cashLocalTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-zinc-800/80 pb-2">
                <span className="text-blue-400 font-bold">💳 Datáfono TPV:</span>
                <span className="font-black text-blue-300">{stats.totalTpv.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-zinc-800/80 pb-2">
                <span className="text-purple-400 font-bold">📱 Pagos App Online:</span>
                <span className="font-black text-purple-300">{stats.totalOnline.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center text-base pt-1">
                <span className="text-green-400 font-black uppercase">💰 Facturación Total:</span>
                <span className="font-black text-green-400 text-xl">{stats.totalRevenue.toFixed(2)}€</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center leading-relaxed">
              Elige cómo deseas proceder con el cierre contable del día:
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowDailyCloseModal(false);
                  triggerAuditPrint();
                }}
                disabled={isClosingShift}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-black uppercase transition-all shadow-md flex items-center justify-center gap-2"
              >
                🖨️ Solo Imprimir / Guardar PDF (Mantener App Abierta)
              </button>

              <button
                onClick={handlePerformDailyClose}
                disabled={isClosingShift}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-2xl text-xs font-black uppercase transition-all shadow-xl flex items-center justify-center gap-2 border border-red-400/40 disabled:opacity-50"
              >
                {isClosingShift ? '🔒 Cerrando Jornada...' : '🔒 Imprimir PDF y CERRAR JORNADA OPERATIVA'}
              </button>

              <button
                onClick={() => setShowDailyCloseModal(false)}
                disabled={isClosingShift}
                className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase transition-colors"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE A4 AUDIT & FISCAL ACCOUNTING REPORT (PARA GESTORÍA Y EMPRESA)
          ========================================================================= */}
      <div className="audit-report-container hidden print:block p-6 sm:p-10 bg-white text-slate-800 min-h-screen w-full font-sans text-xs leading-normal">
        
        {/* 1. CABECERA OFICIAL FISCAL & METADATOS (SIN BLOQUES NEGROS) */}
        <div className="border-b-2 border-slate-300 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">NÉSTOR PIZZAS GOURMET S.L.</h1>
            <p className="text-[10px] text-slate-600 font-medium">Calle Alcalde Felip, 9 — Caniles (Granada) | CP: 18810</p>
            <p className="text-[9px] text-slate-500">CIF: B-18810992 &bull; Sistema POS Enterprise &bull; Registro Fiscal de Ventas</p>
          </div>
          
          <div className="border border-slate-300 bg-slate-50 rounded-lg p-2.5 text-right min-w-[200px]">
            <span className="block text-[11px] font-black text-slate-900 uppercase tracking-wide">Informe Contable & Cierre Fiscal</span>
            <span className="block text-[10px] font-bold text-green-700">{getFilterLabel()}</span>
            <span className="block text-[8.5px] text-slate-500 mt-0.5">Emisión: {new Date().toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* 2. CUADRO RESUMEN FINANCIERO Y ARQUEO (BALANCE POR MÉTODOS DE COBRO) */}
        <div className="mb-4">
          <h2 className="text-[10.5px] font-black uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1 flex justify-between">
            <span>1. Resumen Consolidado de Ingresos & Métodos de Pago</span>
          </h2>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 border border-slate-300 rounded bg-slate-50 text-center">
              <span className="block text-[8.5px] font-bold text-slate-600 uppercase">Efectivo Total</span>
              <span className="block text-base font-black text-slate-900">{stats.totalCash.toFixed(2)} €</span>
              <span className="block text-[7.5px] text-slate-500">Reparto: {stats.cashDeliveryTotal.toFixed(2)}€ | Local: {stats.cashLocalTotal.toFixed(2)}€</span>
            </div>

            <div className="p-2 border border-slate-300 rounded bg-slate-50 text-center">
              <span className="block text-[8.5px] font-bold text-slate-600 uppercase">Datáfono TPV Físico</span>
              <span className="block text-base font-black text-slate-900">{stats.totalTpv.toFixed(2)} €</span>
              <span className="block text-[7.5px] text-slate-500">Tarjetas de crédito/débito</span>
            </div>

            <div className="p-2 border border-slate-300 rounded bg-slate-50 text-center">
              <span className="block text-[8.5px] font-bold text-slate-600 uppercase">Pasarela App / Online</span>
              <span className="block text-base font-black text-slate-900">{stats.totalOnline.toFixed(2)} €</span>
              <span className="block text-[7.5px] text-slate-500">SumUp / Pagos Web</span>
            </div>

            <div className="p-2 border-1.5 border-slate-900 rounded bg-slate-100 text-center">
              <span className="block text-[8.5px] font-black text-slate-900 uppercase">Facturación Total Neta</span>
              <span className="block text-lg font-black text-slate-900">{stats.totalRevenue.toFixed(2)} €</span>
              <span className="block text-[7.5px] text-slate-600 font-bold">{stats.deliveredCount} Entregados | {stats.cancelledCount} Cancelados</span>
            </div>
          </div>
        </div>

        {/* 3. RECUADRO DE CONCILIACIÓN FÍSICA PARA REPARTIDORES */}
        <div className="mb-4 p-2.5 border border-amber-400 bg-amber-50/80 rounded-lg flex justify-between items-center">
          <div>
            <span className="font-black text-[10px] text-amber-900 uppercase">🛵 Liquidación Exclusiva de Repartidores (Efectivo en Mano):</span>
            <p className="text-[8.5px] text-amber-800">Dinero líquido exacto que deben depositar físicamente los repartidores al cierre de turno.</p>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-amber-950 border-b-2 border-amber-600 pb-0.5">{stats.cashDeliveryTotal.toFixed(2)} €</span>
            <span className="block text-[8px] text-amber-800 font-bold">{stats.cashDeliveryCount} entregas en efectivo</span>
          </div>
        </div>

        {/* 4. TABLAS AUDITABLES SEGREGADAS POR CANAL DE SERVICIO */}
        
        {/* BLOQUE A: PEDIDOS A DOMICILIO */}
        <div className="mb-4">
          <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 bg-slate-100 px-2 py-1 rounded-t">
            <h3 className="font-bold text-[9.5px] uppercase text-slate-900">
              A. Reparto a Domicilio ({stats.deliveryOrders.length} pedidos)
            </h3>
            <span className="font-bold text-[9.5px] text-slate-900">
              Subtotal Canal: {stats.deliveryTotalRevenue.toFixed(2)} €
            </span>
          </div>

          {stats.deliveryOrders.length === 0 ? (
            <p className="text-[8.5px] text-slate-400 italic px-2 py-1">No se registraron entregas a domicilio en este periodo.</p>
          ) : (
            <table className="w-full text-left text-[8.5px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-50">
                  <th className="py-1 px-1.5" style={{ width: '12%' }}>ID Ticket</th>
                  <th className="py-1 px-1.5" style={{ width: '16%' }}>Fecha / Hora</th>
                  <th className="py-1 px-1.5" style={{ width: '24%' }}>Cliente & Teléfono</th>
                  <th className="py-1 px-1.5" style={{ width: '26%' }}>Dirección de Entrega</th>
                  <th className="py-1 px-1.5" style={{ width: '11%' }}>Cobro</th>
                  <th className="py-1 px-1.5 text-right" style={{ width: '11%' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {stats.deliveryOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-200 even:bg-slate-50/50">
                    <td className="py-1 px-1.5 font-mono text-[8px]">#{order.id.slice(0, 8)}</td>
                    <td className="py-1 px-1.5 text-slate-600">{new Date(order.created_at).toLocaleDateString('es-ES')} {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-1 px-1.5 font-bold text-slate-900">{order.client_name || 'Sin Nombre'} {order.client_phone ? `(${order.client_phone})` : ''}</td>
                    <td className="py-1 px-1.5 text-slate-600 max-w-[170px] truncate">{order.delivery_address ? formatAddress(order.delivery_address as any) : '-'}</td>
                    <td className="py-1 px-1.5 font-medium">{formatPayMethod(order.payment_method)}</td>
                    <td className="py-1 px-1.5 text-right font-black text-slate-900">{Number(order.total_amount || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BLOQUE B: PEDIDOS PARA RECOGER EN LOCAL */}
        <div className="mb-4">
          <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 bg-slate-100 px-2 py-1 rounded-t">
            <h3 className="font-bold text-[9.5px] uppercase text-slate-900">
              B. Recogida en Local / Take-Away ({stats.pickupOrders.length} pedidos)
            </h3>
            <span className="font-bold text-[9.5px] text-slate-900">
              Subtotal Canal: {stats.pickupTotalRevenue.toFixed(2)} €
            </span>
          </div>

          {stats.pickupOrders.length === 0 ? (
            <p className="text-[8.5px] text-slate-400 italic px-2 py-1">No se registraron pedidos de recogida en este periodo.</p>
          ) : (
            <table className="w-full text-left text-[8.5px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-50">
                  <th className="py-1 px-1.5" style={{ width: '12%' }}>ID Ticket</th>
                  <th className="py-1 px-1.5" style={{ width: '16%' }}>Fecha / Hora</th>
                  <th className="py-1 px-1.5" style={{ width: '24%' }}>Cliente & Teléfono</th>
                  <th className="py-1 px-1.5" style={{ width: '26%' }}>Notas / Referencia</th>
                  <th className="py-1 px-1.5" style={{ width: '11%' }}>Cobro</th>
                  <th className="py-1 px-1.5 text-right" style={{ width: '11%' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {stats.pickupOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-200 even:bg-slate-50/50">
                    <td className="py-1 px-1.5 font-mono text-[8px]">#{order.id.slice(0, 8)}</td>
                    <td className="py-1 px-1.5 text-slate-600">{new Date(order.created_at).toLocaleDateString('es-ES')} {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-1 px-1.5 font-bold text-slate-900">{order.client_name || 'Mostrador'} {order.client_phone ? `(${order.client_phone})` : ''}</td>
                    <td className="py-1 px-1.5 text-slate-600 max-w-[170px] truncate">{order.notes || 'Recogida en mostrador'}</td>
                    <td className="py-1 px-1.5 font-medium">{formatPayMethod(order.payment_method)}</td>
                    <td className="py-1 px-1.5 text-right font-black text-slate-900">{Number(order.total_amount || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BLOQUE C: CONSUMO EN MESA / LOCAL */}
        <div className="mb-4">
          <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 bg-slate-100 px-2 py-1 rounded-t">
            <h3 className="font-bold text-[9.5px] uppercase text-slate-900">
              C. Servicio en Mesa / Sala Local ({stats.localDiningOrders.length} comandas)
            </h3>
            <span className="font-bold text-[9.5px] text-slate-900">
              Subtotal Canal: {stats.localDiningTotalRevenue.toFixed(2)} €
            </span>
          </div>

          {stats.localDiningOrders.length === 0 ? (
            <p className="text-[8.5px] text-slate-400 italic px-2 py-1">No se registraron comandas de mesa en este periodo.</p>
          ) : (
            <table className="w-full text-left text-[8.5px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-50">
                  <th className="py-1 px-1.5" style={{ width: '12%' }}>ID Ticket</th>
                  <th className="py-1 px-1.5" style={{ width: '16%' }}>Fecha / Hora</th>
                  <th className="py-1 px-1.5" style={{ width: '24%' }}>Mesa / Referencia</th>
                  <th className="py-1 px-1.5" style={{ width: '26%' }}>Notas Comanda</th>
                  <th className="py-1 px-1.5" style={{ width: '11%' }}>Cobro</th>
                  <th className="py-1 px-1.5 text-right" style={{ width: '11%' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {stats.localDiningOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-200 even:bg-slate-50/50">
                    <td className="py-1 px-1.5 font-mono text-[8px]">#{order.id.slice(0, 8)}</td>
                    <td className="py-1 px-1.5 text-slate-600">{new Date(order.created_at).toLocaleDateString('es-ES')} {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-1 px-1.5 font-bold text-slate-900">{order.client_name || 'Mesa Local'}</td>
                    <td className="py-1 px-1.5 text-slate-600 max-w-[170px] truncate">{order.notes || '-'}</td>
                    <td className="py-1 px-1.5 font-medium">{formatPayMethod(order.payment_method)}</td>
                    <td className="py-1 px-1.5 text-right font-black text-slate-900">{Number(order.total_amount || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BLOQUE D: INCIDENCIAS / CANCELADOS (SOLO SI EXISTEN) */}
        {stats.cancelledOrdersList.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 bg-slate-100 px-2 py-1 rounded-t">
              <h3 className="font-bold text-[9.5px] uppercase text-slate-700">
                D. Pedidos Cancelados / Anulados ({stats.cancelledOrdersList.length} pedidos)
              </h3>
              <span className="font-bold text-[8.5px] text-slate-500">
                Importe No Cobrado: {stats.cancelledOrdersList.reduce((sum, o) => sum + Number(o.total_amount || 0), 0).toFixed(2)} €
              </span>
            </div>

            <table className="w-full text-left text-[8.5px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 font-bold bg-slate-50">
                  <th className="py-1 px-1.5" style={{ width: '12%' }}>ID Ticket</th>
                  <th className="py-1 px-1.5" style={{ width: '16%' }}>Fecha</th>
                  <th className="py-1 px-1.5" style={{ width: '24%' }}>Cliente</th>
                  <th className="py-1 px-1.5" style={{ width: '37%' }}>Motivo / Notas</th>
                  <th className="py-1 px-1.5 text-right" style={{ width: '11%' }}>Anulado</th>
                </tr>
              </thead>
              <tbody>
                {stats.cancelledOrdersList.map(order => (
                  <tr key={order.id} className="border-b border-slate-200 text-slate-500">
                    <td className="py-1 px-1.5 font-mono text-[8px]">#{order.id.slice(0, 8)}</td>
                    <td className="py-1 px-1.5">{new Date(order.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="py-1 px-1.5">{order.client_name || 'Sin Nombre'}</td>
                    <td className="py-1 px-1.5 text-[8px] italic">{order.notes || 'Cancelado por administración'}</td>
                    <td className="py-1 px-1.5 text-right line-through">{Number(order.total_amount || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. CERTIFICACIÓN LEGAL Y BLOQUE DE FIRMAS */}
        <div className="mt-6 pt-3 border-t-2 border-slate-300 grid grid-cols-2 gap-10 text-center text-[9.5px]">
          <div>
            <div className="border-b border-slate-400 h-10 mb-1.5"></div>
            <p className="font-black text-slate-900">Firma del Responsable de Turno / Caja</p>
            <p className="text-[8px] text-slate-500">Certifico la veracidad del arqueo físico y cobros efectuados</p>
          </div>
          
          <div>
            <div className="border-b border-slate-400 h-10 mb-1.5"></div>
            <p className="font-black text-slate-900">Sello de Gerencia / Asesoría Fiscal y Contable</p>
            <p className="text-[8px] text-slate-500">Recepción contable oficial para balance y liquidación tributaria</p>
          </div>
        </div>

        <div className="mt-4 text-center text-[7.5px] text-slate-400">
          <p>Documento oficial emitido por Néstor Pizzas PWA v2.4.0 — Certificación de auditoría interna y conciliación fiscal conforme a la RGPD.</p>
        </div>

      </div>

    </div>
  );
}
