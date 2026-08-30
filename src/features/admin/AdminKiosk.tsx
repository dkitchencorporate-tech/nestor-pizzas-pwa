import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useKioskCartStore, KioskClientInfo } from '../../store/kioskCartStore';
import { useAdminUiStore } from '../../store/adminUiStore';
import { sendToNetworkPrinter } from '../../utils/printerService';
import TicketPrinter from '../../components/TicketPrinter';
import KioskSauceModal from '../../components/KioskSauceModal';
import KioskIngredientsModal from '../../components/KioskIngredientsModal';
import KioskPromoJuevesModal from '../../components/KioskPromoJuevesModal';
import { CartItem } from '../../store/cartStore';
import { formatAddress } from '../../utils/addressUtils';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: number;
  category_id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function AdminKiosk() {
  const { editingOrder, finishEditingOrder, setActiveTab } = useAdminUiStore();
  const { 
    items, 
    clientInfo, 
    deliveryMethod,
    setClientInfo, 
    setDeliveryMethod,
    resetKiosk,
    addItem, 
    removeItem, 
    updateQuantity, 
    updatePrice,
    clearCart, 
    getTotal 
  } = useKioskCartStore();

  const [view, setView] = useState<'client' | 'catalog'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableName, setTableName] = useState('');
  const [showChangeClientModal, setShowChangeClientModal] = useState(false);
  const [searchResults, setSearchResults] = useState<KioskClientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Efecto para cargar pedido en modo edición
  useEffect(() => {
    if (editingOrder) {
      clearCart();
      setDeliveryMethod(editingOrder.delivery_method || 'local');
      setView('catalog');
      if (editingOrder.client_phone) {
        setClientInfo({
          full_name: editingOrder.client_name,
          phone: editingOrder.client_phone,
          address: editingOrder.delivery_address,
          is_registered: false
        });
      }
      setDeliveryMethod(editingOrder.delivery_method || 'local');
      
      // We purposefully DO NOT load existing items into the cart, 
      // so the cart only contains NEW items to be added.
    }
  }, [editingOrder]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printingAdditionalOrder, setPrintingAdditionalOrder] = useState<any>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const [orderNotes, setOrderNotes] = useState('');

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'tpv' | 'cash'>('tpv');

  const [kioskNotification, setKioskNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showKioskNotif = (msg: string, type: 'success' | 'error') => {
    setKioskNotification({ msg, type });
    setTimeout(() => setKioskNotification(null), 4000);
  };

  // Modal para crear cliente
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressCP, setAddressCP] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [kioskSauceProduct, setKioskSauceProduct] = useState<Product | null>(null);
  const [kioskIngrProduct, setKioskIngrProduct] = useState<Product | null>(null);
  const [kioskPromoOpen, setKioskPromoOpen] = useState(false);

  useEffect(() => {
    loadCatalog();

    // Suscripción a cambios en productos y categorías para mantener sincronizado
    const channel = supabase.channel('kiosk_catalog_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('Catálogo actualizado. Recargando...');
        loadCatalog();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadCatalog();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCatalog = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_active', true).order('name')
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_client', { p_query: searchQuery });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching client:', error);
      alert('Error buscando cliente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenCreateModal = () => {
    const query = searchQuery.trim();
    const isPhone = /^[+]?[0-9\s-]+$/.test(query) && query.replace(/[^0-9]/g, '').length >= 6;
    
    if (isPhone) {
      setNewClientPhone(query.replace(/[^0-9]/g, ''));
      setNewClientName('');
    } else {
      setNewClientName(query);
      setNewClientPhone('');
    }
    
    setAddressStreet('');
    setAddressNumber('');
    setAddressCP('18810');
    setAddressNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientPhone || !newClientName || !addressStreet || !addressNumber || !addressCP) {
      return alert('Faltan datos obligatorios');
    }

    setIsCreatingClient(true);
    try {
      const addressJson = JSON.stringify({
        street: addressStreet,
        number: addressNumber,
        cp: addressCP,
        notes: addressNotes
      });

      const { data: newId, error } = await supabase.rpc('create_kiosk_client', {
        p_full_name: newClientName,
        p_phone: newClientPhone,
        p_address: addressJson
      });

      if (error) throw error;

      // Asignar cliente y pasar al catálogo
      setClientInfo({
        id: newId,
        full_name: newClientName,
        phone: newClientPhone,
        address: addressJson,
        is_registered: false
      });
      
    setNewClientName('');
    setNewClientPhone('');
    setAddressStreet('');
    setAddressNumber('');
    setAddressCP('');
    setAddressNotes('');
    setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error('Error creando cliente:', error);
      alert(error.message || 'Error al crear cliente.');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const selectClient = (client: KioskClientInfo) => {
    setClientInfo(client);
    setSearchQuery('');
    setSearchResults([]);
  };

  const skipClientAssignment = () => {
    setClientInfo({
      full_name: tableName.trim() ? tableName.trim() : 'Mesa / Local',
      phone: '000000000',
      address: 'Local',
      is_registered: false
    });
    setView('catalog');
  };

  const handleProcessOrder = async () => {
    if (items.length === 0) return alert('El carrito está vacío.');
    
    // Validar si requiere cliente
    if (!clientInfo && deliveryMethod !== 'local') {
      alert('Debes asignar un cliente para pedidos de Recogida o Domicilio.');
      setView('client');
      return;
    }

    setIsProcessing(true);
    try {
      const formattedItems = items.map((item, index) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        customization_details: { 
          name: item.name, 
          notes: item.notes, 
          extras: item.extras,
          ...(index === 0 ? { is_tpv_order: true } : {})
        }
      }));


      let rpcName = 'process_checkout';
      let rpcParams: any = {
        p_user_id: clientInfo?.id || null,
        p_client_name: deliveryMethod === 'local' ? (tableName.trim() || clientInfo?.full_name || 'Mesa / Local') : (clientInfo?.full_name || 'Sin Nombre'),
        p_client_phone: deliveryMethod === 'local' ? '000000000' : (clientInfo?.phone || '000000000'),
        p_delivery_address: deliveryMethod === 'local' ? (tableName.trim() ? `Mesa: ${tableName.trim()}` : 'Local') : (clientInfo?.address || 'Local'),
        p_delivery_method: deliveryMethod,
        p_items: formattedItems,
        p_points_redeemed: false,
        p_small_order_fee_accepted: true,
        p_ip_address: 'kiosk',
        p_notes: orderNotes,
        p_payment_method: paymentMethod
      };

      if (editingOrder) {
         rpcName = 'add_items_to_kiosk_order';
         rpcParams = {
            p_order_id: editingOrder.id,
            p_extra_total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            p_items: formattedItems
         };
      }

      const { data, error } = await supabase.rpc(rpcName, rpcParams);

      if (error) throw error;
      // La impresión ahora se delega al gestor de pedidos (AdminOrders)
      // para que el encargado acepte los nuevos ítems manualmente.

      showKioskNotif(editingOrder ? '¡Añadido a la mesa correctamente!' : '¡Pedido procesado correctamente!', 'success');
      resetKiosk();
      setOrderNotes('');
      if (editingOrder) {
         finishEditingOrder(); // Volver a órdenes
      } else {
         setView('catalog');
         setActiveTab('orders'); // Redirigir automáticamente al gestor de pedidos/cocina
      }

    } catch (error: any) {
      console.error('Error processing order:', error);
      showKioskNotif(error.message || 'Error al procesar el pedido.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Referencias para el scroll a las categorías
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToCategory = (categoryId: string) => {
    categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleKioskProductAdd = (product: Product) => {
    // Patatas Gajos (ID 33) → selector de salsa obligatorio
    if (product.id === 33) {
      setKioskSauceProduct(product);
      return;
    }
    // Promo Jueves Locos (ID 999) → modal de promo
    if (product.id === 999) {
      setKioskPromoOpen(true);
      return;
    }
    // Todas las Pizzas → selector de ingredientes
    if (
      product.category_id?.includes('PIZZA') || 
      product.category_id === 'NUESTRAS PIZZAS' ||
      product.category_id === 'PIZZAS BLANCAS' ||
      product.category_id === 'MAZZI PIZZAS' ||
      product.id === 22 || 
      product.id === 23
    ) {
      setKioskIngrProduct(product);
      return;
    }
    // Resto de productos → añadir directo
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  };

  return (
    <div className="h-full flex bg-[#0A0A0E] text-white overflow-hidden relative print:h-auto print:overflow-visible print:block print:bg-white print:text-black">
      
      {/* Notification Toast */}
      {kioskNotification && (
        <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm uppercase tracking-wider animate-fade-in flex items-center gap-3 ${
          kioskNotification.type === 'success' 
            ? 'bg-green-600 text-white border border-green-500' 
            : 'bg-red-600 text-white border border-red-500'
        }`}>
          <span>{kioskNotification.type === 'success' ? '✅' : '❌'}</span>
          <span>{kioskNotification.msg}</span>
        </div>
      )}
      {/* ============================================================ */}
      {/* VISTA 1: ASIGNACIÓN DE CLIENTE */}
      {/* ============================================================ */}
      {view === 'client' && (
        <div className="w-full h-full flex items-center justify-center p-4 print:hidden">
          <div className="w-full max-w-xl bg-[#14141E] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-display font-black uppercase tracking-widest text-white mb-2">Nuevo Ticket</h2>
            <p className="text-gray-400 mb-8 text-center text-sm">Selecciona cómo se entregará el pedido y a quién.</p>
            
            <div className="w-full grid grid-cols-3 gap-3 mb-8">
              {(['local', 'pickup', 'delivery'] as const).map(method => (
                <button 
                  key={method}
                  onClick={() => setDeliveryMethod(method)}
                  className={`py-4 px-3 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all border ${deliveryMethod === method ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800'}`}
                >
                  <span className="text-2xl">{method === 'local' ? '🍴' : method === 'pickup' ? '🛍️' : '🛵'}</span>
                  <span>{method === 'local' ? 'Local / Mesa' : method === 'pickup' ? 'Recogida' : 'Domicilio'}</span>
                </button>
              ))}
            </div>

            {deliveryMethod !== 'local' && (
              <div className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4 text-center">Asignar Cliente</h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por Teléfono, Nombre o Dirección..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <button type="submit" disabled={isSearching} className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-bold transition-all">
                    🔍 Buscar
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {searchResults.map((c, i) => (
                      <div key={i} onClick={() => selectClient(c)} className="bg-zinc-800/80 hover:bg-zinc-700 p-4 rounded-xl cursor-pointer border border-zinc-700 flex items-center justify-between transition-all">
                        <div>
                          <p className="font-bold text-lg text-white">{c.full_name || 'Sin Nombre'}</p>
                          <p className="text-sm text-gray-400 font-mono mt-0.5">{c.phone}</p>
                          {c.address && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{formatAddress(c.address)}</p>}
                        </div>
                        <div className="flex flex-col items-end">
                          {c.is_registered ? (
                            <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-bold">USUARIO APP</span>
                          ) : (
                            <span className="bg-gray-500/20 text-gray-400 text-xs px-3 py-1 rounded-full font-bold">MOSTRADOR</span>
                          )}
                          {c.is_registered && ((c as any).points) !== undefined && (
                            <span className="text-yellow-400 text-xs font-bold mt-2 font-mono">{((c as any).points)} pts</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="mt-4 text-center p-6 bg-zinc-800/50 rounded-xl border border-dashed border-zinc-600">
                    <p className="text-zinc-400 mb-4">No se encontró a nadie con "{searchQuery}"</p>
                    <button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 hover:scale-105">
                      ➕ Crear Cliente Nuevo
                    </button>
                  </div>
                )}
                
                {clientInfo && (
                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl relative">
                    <button onClick={() => setClientInfo(undefined)} className="absolute top-2 right-2 text-zinc-500 hover:text-white">✕</button>
                    <h4 className="font-bold text-green-400 text-lg mb-1">Cliente Asignado:</h4>
                    <p className="text-white font-bold">{clientInfo.full_name}</p>
                    <p className="text-zinc-400 text-sm font-mono">{clientInfo.phone}</p>
                    {clientInfo.address && <p className="text-zinc-500 text-xs mt-1">{formatAddress(clientInfo.address)}</p>}
                  </div>
                )}
              </div>
            )}

            {deliveryMethod === 'local' && (
              <div className="w-full flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Ej: Mesa 1, Barra, José (Opcional)" 
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-zinc-900 text-white p-4 rounded-xl border border-zinc-700 outline-none focus:border-green-500 transition-colors"
                />
              </div>
            )}
            
            {/* Payment Method Selector (Only for Delivery/Pickup) */}
            {deliveryMethod !== 'local' && clientInfo && (
              <div className="w-full mt-6">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4 text-center">Método de Pago</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-xl font-bold uppercase tracking-wider transition-all border ${paymentMethod === 'cash' ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    💵 Efectivo
                  </button>
                  <button onClick={() => setPaymentMethod('tpv')} className={`py-4 rounded-xl font-bold uppercase tracking-wider transition-all border ${paymentMethod === 'tpv' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    💳 Tarjeta (TPV)
                  </button>
                </div>
              </div>
            )}

            <div className="w-full mt-8 flex gap-4">
              <button onClick={() => setView('catalog')} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold tracking-wider text-sm transition-colors rounded-xl">
                ← Volver
              </button>
              <button 
                onClick={handleProcessOrder}
                disabled={isProcessing || (deliveryMethod !== 'local' && !clientInfo)}
                className={`flex-[2] py-4 font-black tracking-wider text-sm transition-all rounded-xl ${isProcessing || (deliveryMethod !== 'local' && !clientInfo) ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}
              >
                {isProcessing ? 'Enviando...' : (editingOrder ? 'ACTUALIZAR PEDIDO' : 'ENVIAR A COCINA ➔')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: CATÁLOGO Y TICKET */}
      {/* ============================================================ */}
      {view === 'catalog' && (
        <div className="w-full h-full flex gap-4 p-4 print:hidden">
          
          {/* PANEL IZQUIERDO: CATÁLOGO CON SCROLL CONTINUO */}
          <div className="flex-1 bg-[#14141E] border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            
            {/* Header de la vista con botón para volver atrás */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => {
                  if (items.length > 0) {
                    if (window.confirm('¿Seguro que quieres salir? Se vaciará el carrito actual.')) {
                      resetKiosk();
                      finishEditingOrder();
                    }
                  } else {
                    finishEditingOrder();
                  }
                }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="font-display font-black text-xl tracking-widest text-white uppercase">Menú</h2>
              </div>
              
              {/* Categorías Sticky en Horizontal */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm whitespace-nowrap transition-colors"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scroll de Productos agrupados por Categoría */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-12 pb-24">
                {categories.map(cat => {
                  const catProducts = products.filter(p => p.category_id === cat.id);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.id} ref={(el: any) => categoryRefs.current[cat.id] = el} className="scroll-mt-6">
                      <h3 className="font-display font-black text-2xl uppercase tracking-widest text-green-500 mb-6 flex items-center gap-4">
                        {cat.name}
                        <div className="flex-1 h-px bg-zinc-800"></div>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {catProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleKioskProductAdd(product)}
                            className="bg-[#1A1A24] border border-zinc-800 hover:border-green-500 hover:bg-zinc-800 p-5 rounded-2xl flex flex-col text-left transition-all group shadow-lg"
                          >
                            <span className="font-bold text-white text-base leading-tight mb-4 group-hover:text-green-400">{product.name}</span>
                            <span className="font-mono text-green-500 font-bold text-lg mt-auto">{product.price.toFixed(2)}€</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: TICKET Y CLIENTE */}
          <div className="w-[400px] flex flex-col gap-4">
            
            {editingOrder && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <span className="font-bold text-yellow-500 uppercase tracking-widest text-sm text-center">
                  ➕ Añadiendo a: {editingOrder.client_name}
                </span>
                <span className="text-xs text-yellow-500/70 text-center font-medium">
                  Los productos añadidos se enviarán directo a cocina. No se imprimirá comprobante en mostrador.
                </span>
              </div>
            )}

            {/* Ticket de Compra */}
            <div className="bg-[#14141E] border border-zinc-800 rounded-3xl flex-1 flex flex-col shadow-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h3 className="font-bold text-sm text-white uppercase tracking-widest">Ticket Actual</h3>
                <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 font-bold">Vaciar</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                    <div className="flex-1 pr-3">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {editingPriceId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={editingPriceValue}
                              onChange={(e) => {
                                setEditingPriceValue(e.target.value);
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  updatePrice(item.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              onBlur={() => setEditingPriceId(null)}
                              className="w-16 bg-[#0A0A0E] text-white text-xs px-2 py-1 rounded border border-green-500 outline-none"
                              step="0.1"
                            />
                            <span className="text-xs text-zinc-500">€/u</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-zinc-500">{item.price.toFixed(2)}€/u</p>
                            <button onClick={() => {
                              setEditingPriceId(item.id);
                              setEditingPriceValue(item.price.toString());
                            }} className="text-zinc-500 hover:text-white transition-colors" title="Editar precio">
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#1A1A24] rounded-xl p-1 border border-zinc-700">
                      <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors font-bold text-lg">
                        {item.quantity > 1 ? '−' : '×'}
                      </button>
                      <span className="w-4 text-center font-bold text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors font-bold text-lg">+</button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 p-6 text-center">
                    <span className="text-5xl mb-4">🛒</span>
                    <p className="text-base font-bold">El ticket está vacío</p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-zinc-800 bg-zinc-900">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Total Pagar</span>
                  <span className="text-4xl font-display font-black text-green-500">{items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€</span>
                </div>
                
                <button
                  onClick={() => {
                    if (deliveryMethod === 'local' && editingOrder) {
                      handleProcessOrder(); // If it's a mesa order being edited, we can just save it.
                    } else {
                      setView('client');
                    }
                  }}
                  disabled={items.length === 0}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-base transition-all ${items.length === 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_25px_rgba(22,163,74,0.4)] hover:shadow-[0_0_35px_rgba(22,163,74,0.6)]'}`}
                >
                  {editingOrder && deliveryMethod === 'local' ? 'GUARDAR MESA' : 'SIGUIENTE ➔'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL CREAR CLIENTE KIOSKO */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#14141E] border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest mb-6">Nuevo Cliente</h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre Completo</label>
                <input type="text" required value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Teléfono (Se usará de ID)</label>
                <input type="tel" required value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Calle o Avenida *</label>
                  <input type="text" required value={addressStreet} onChange={e => setAddressStreet(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Número *</label>
                  <input type="text" required value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Código Postal *</label>
                  <input type="text" required value={addressCP} onChange={e => setAddressCP(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notas adicionales (Opcional)</label>
                  <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej: Piso 2A, Puerta azul" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white mt-1" />
                </div>
              </div>
              <button type="submit" disabled={isCreatingClient} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-all uppercase tracking-widest text-sm">
                {isCreatingClient ? 'Guardando...' : 'Guardar y Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {kioskSauceProduct && (
        <KioskSauceModal
          product={kioskSauceProduct as any}
          onClose={() => setKioskSauceProduct(null)}
          onAdd={(item) => { addItem(item); setKioskSauceProduct(null); }}
        />
      )}

      {kioskIngrProduct && (
        <KioskIngredientsModal
          product={kioskIngrProduct as any}
          onClose={() => setKioskIngrProduct(null)}
          onAdd={(item) => { addItem(item); setKioskIngrProduct(null); }}
        />
      )}

      {kioskPromoOpen && (
        <KioskPromoJuevesModal
          onClose={() => setKioskPromoOpen(false)}
          onAdd={(item) => { addItem(item); setKioskPromoOpen(false); }}
        />
      )}

            {/* Custom Change Client Modal */}
      {showChangeClientModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#14141E] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-3xl">⚠️</span>
              </div>
              <h3 className="font-black text-white text-xl uppercase tracking-widest mb-2">¿Cambiar Cliente?</h3>
              <p className="text-zinc-400 text-sm">
                Vas a reasignar este pedido a otro cliente. Tus productos seleccionados <strong>no se borrarán</strong>.
              </p>
            </div>
            <div className="p-4 bg-zinc-900/50 flex gap-4 border-t border-zinc-800">
              <button 
                onClick={() => setShowChangeClientModal(false)}
                className="flex-1 py-3 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setView('client');
                  setShowChangeClientModal(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl py-3 transition-colors shadow-lg shadow-red-600/20"
              >
                Sí, Cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente invisible para impresión térmica (Adiciones a mesa) */}
      {printingAdditionalOrder && <TicketPrinter order={printingAdditionalOrder} />}

      {/* ESTILOS GLOBALES PARA EL TPV */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}} />
    </div>
  );
}
