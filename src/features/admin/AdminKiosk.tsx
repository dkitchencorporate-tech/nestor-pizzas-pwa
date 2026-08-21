import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useKioskCartStore, KioskClientInfo } from '../../store/kioskCartStore';
import { useAdminUiStore } from '../../store/adminUiStore';
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
  const { editingOrder, finishEditingOrder } = useAdminUiStore();
  const { 
    items, 
    clientInfo, 
    deliveryMethod,
    setClientInfo, 
    setDeliveryMethod,
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    getTotal 
  } = useKioskCartStore();

  const [view, setView] = useState<'client' | 'catalog'>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KioskClientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Efecto para cargar pedido en modo edición
  useEffect(() => {
    if (editingOrder) {
      clearCart();
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
      
      // Load items
      if (editingOrder.order_items) {
        editingOrder.order_items.forEach((item: any) => {
           // We need to match the cart item structure
           addItem({
             product_id: item.product_id,
             name: item.customization_details?.name || 'Producto Editado',
             price: item.unit_price,
             quantity: item.quantity,
             notes: item.customization_details?.notes || '',
             extras: item.customization_details?.extras || []
           });
        });
      }
    }
  }, [editingOrder]);


  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
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
    setIsCreateModalOpen(false);

      setView('catalog');
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
    setView('catalog');
  };

  const skipClientAssignment = () => {
    setClientInfo(undefined); // Sin cliente asignado
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
        p_client_name: clientInfo?.full_name || 'Mesa / Local',
        p_client_phone: clientInfo?.phone || '000000000',
        p_delivery_address: clientInfo?.address || 'Local',
        p_delivery_method: deliveryMethod,
        p_items: formattedItems,
        p_points_redeemed: false,
        p_small_order_fee_accepted: true,
        p_ip_address: 'kiosk'
      };

      if (editingOrder) {
         rpcName = 'update_kiosk_order';
         rpcParams = {
            p_order_id: editingOrder.id,
            p_items: formattedItems,
            p_ip_address: 'kiosk'
         };
      }

      const { data, error } = await supabase.rpc(rpcName, rpcParams);


      if (error) throw error;


      showKioskNotif(editingOrder ? '¡Pedido actualizado correctamente!' : '¡Pedido procesado correctamente!', 'success');
      clearCart();
      if (editingOrder) {
         finishEditingOrder(); // Volver a órdenes
      } else {
         setView('client');
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
    // Pizza Margarita (ID 22) o Maxi Pizza/Mazza (ID 23) → selector de ingredientes
    if (product.id === 22 || product.id === 23) {
      setKioskIngrProduct(product);
      return;
    }
    // Promo Jueves Locos (ID 999) → modal de promo
    if (product.id === 999) {
      setKioskPromoOpen(true);
      return;
    }
    // Resto de productos → añadir directo
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  };

  return (
    <div className="h-full flex bg-[#0A0A0E] text-white overflow-hidden relative">
      
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
        <div className="w-full h-full flex items-center justify-center p-4">
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
                        {c.is_registered && c.points !== undefined && (
                          <span className="text-yellow-400 text-xs font-bold mt-2 font-mono">{c.points} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="mt-4 text-center p-6 bg-zinc-800/50 rounded-xl border border-dashed border-zinc-600">
                  <p className="text-zinc-400 mb-4">No se encontró a nadie con "{searchQuery}"</p>
                  <button onClick={() => { setNewClientPhone(searchQuery); setIsCreateModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all">
                    ➕ Crear Cliente Nuevo
                  </button>
                </div>
              )}
            </div>

            {deliveryMethod === 'local' && (
              <button onClick={skipClientAssignment} className="mt-6 w-full py-4 text-gray-400 hover:text-white font-bold tracking-wider text-sm transition-colors border border-transparent hover:border-zinc-800 rounded-xl">
                Continuar sin asignar cliente (Solo Mesa) ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: CATÁLOGO Y TICKET */}
      {/* ============================================================ */}
      {view === 'catalog' && (
        <div className="w-full h-full flex gap-4 p-4">
          
          {/* PANEL IZQUIERDO: CATÁLOGO CON SCROLL CONTINUO */}
          <div className="flex-1 bg-[#14141E] border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            
            {/* Header de la vista con botón para volver atrás */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('client')} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors">
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
                    <div key={cat.id} ref={el => categoryRefs.current[cat.id] = el} className="scroll-mt-6">
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
            
            {/* Info del Cliente */}
            <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-5 flex flex-col shadow-xl shrink-0">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${deliveryMethod === 'local' ? 'bg-green-500/20 text-green-400' : deliveryMethod === 'pickup' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                  {deliveryMethod === 'local' ? '🍴 Local/Mesa' : deliveryMethod === 'pickup' ? '🛍️ Recogida' : '🛵 Domicilio'}
                </span>
                <button onClick={() => setView('client')} className="text-xs text-zinc-400 hover:text-white underline">Cambiar</button>
              </div>
              
              {clientInfo ? (
                <div>
                  <h4 className="font-bold text-white text-lg">{clientInfo.full_name}</h4>
                  <p className="text-zinc-400 font-mono text-sm">{clientInfo.phone}</p>
                  {clientInfo.address && <p className="text-zinc-500 text-xs mt-1">{formatAddress(clientInfo.address)}</p>}
                </div>
              ) : (
                <div>
                  <h4 className="font-bold text-zinc-500 text-lg">Mesa Sin Asignar</h4>
                  <p className="text-zinc-600 text-xs">Pedido Anónimo</p>
                </div>
              )}
            </div>

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
                      <p className="text-xs text-zinc-500">{item.price.toFixed(2)}€/u</p>
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
                  <span className="text-4xl font-display font-black text-green-500">{getTotal().toFixed(2)}€</span>
                </div>
                
                <button
                  onClick={handleProcessOrder}
                  disabled={isProcessing || items.length === 0}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-base transition-all ${isProcessing || items.length === 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_25px_rgba(22,163,74,0.4)] hover:shadow-[0_0_35px_rgba(22,163,74,0.6)]'}`}
                >
                  {isProcessing ? 'Procesando...' : 'ENVIAR A COCINA'}
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
          product={kioskSauceProduct}
          onClose={() => setKioskSauceProduct(null)}
          onAdd={(item) => { addItem({ ...item, id: crypto.randomUUID() }); setKioskSauceProduct(null); }}
        />
      )}

      {kioskIngrProduct && (
        <KioskIngredientsModal
          product={kioskIngrProduct}
          onClose={() => setKioskIngrProduct(null)}
          onAdd={(item) => { addItem({ ...item, id: crypto.randomUUID() }); setKioskIngrProduct(null); }}
        />
      )}

      {kioskPromoOpen && (
        <KioskPromoJuevesModal
          onClose={() => setKioskPromoOpen(false)}
          onAdd={(item) => { addItem({ ...item, id: crypto.randomUUID() }); setKioskPromoOpen(false); }}
        />
      )}

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
