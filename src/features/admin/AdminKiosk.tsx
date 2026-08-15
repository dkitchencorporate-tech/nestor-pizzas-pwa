import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useKioskCartStore, KioskClientInfo } from '../../store/kioskCartStore';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KioskClientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_active', true).order('name')
      ]);

      if (catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) setActiveCategory(catRes.data[0].id);
      }
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

  const selectClient = (client: KioskClientInfo) => {
    setClientInfo(client);
    setSearchQuery('');
    setSearchResults([]);
  };

  const setGuestClient = () => {
    setClientInfo({
      full_name: 'Cliente Local',
      phone: searchQuery || '000000000',
      is_registered: false
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleProcessOrder = async () => {
    if (items.length === 0) return alert('El carrito está vacío.');
    if (!clientInfo) return alert('Debes seleccionar un cliente primero.');

    setIsProcessing(true);
    try {
      const formattedItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        customization_details: { name: item.name, notes: item.notes, extras: item.extras }
      }));

      const { data, error } = await supabase.rpc('process_checkout', {
        p_user_id: clientInfo.id || null,
        p_client_name: clientInfo.full_name || 'Cliente Local',
        p_client_phone: clientInfo.phone || '000000000',
        p_delivery_address: clientInfo.address || 'Local',
        p_delivery_method: deliveryMethod,
        p_items: formattedItems,
        p_points_redeemed: false, // En esta versión simplificamos sin canje automático
        p_small_order_fee_accepted: true
      });

      if (error) throw error;

      alert('¡Pedido procesado correctamente!');
      clearCart();
    } catch (error: any) {
      console.error('Error processing order:', error);
      alert(error.message || 'Error al procesar el pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentProducts = products.filter(p => p.category_id === activeCategory);

  return (
    <div className="h-full flex gap-4 p-4 bg-[#0A0A0E] text-white">
      {/* 1. PANEL IZQUIERDO: CLIENTE */}
      <div className="w-[300px] flex flex-col gap-4">
        <div className="bg-[#14141E] border border-zinc-800 rounded-2xl p-4 flex-1">
          <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4">1. Asignar Cliente</h3>
          
          {!clientInfo ? (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Teléfono, Nombre, Domicilio..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button type="submit" disabled={isSearching} className="bg-green-600 hover:bg-green-500 text-white px-3 rounded-lg">
                  🔍
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map((c, i) => (
                    <div key={i} onClick={() => selectClient(c)} className="bg-zinc-800/50 hover:bg-zinc-700 p-3 rounded-xl cursor-pointer border border-zinc-700">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm">{c.full_name || 'Desconocido'}</p>
                        {c.is_registered ? (
                          <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full">App</span>
                        ) : (
                          <span className="bg-gray-500/20 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">Historial</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                      {c.address && <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{c.address}</p>}
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <button onClick={setGuestClient} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 p-3 rounded-xl text-sm transition-all text-left">
                  <p className="font-bold text-white">Crear Cliente Rápido</p>
                  <p className="text-xs text-gray-400 mt-1">Usar "{searchQuery}" como teléfono</p>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl relative">
              <button onClick={() => setClientInfo(undefined)} className="absolute top-2 right-2 text-gray-500 hover:text-white">✕</button>
              <h4 className="font-bold text-green-400 text-lg">{clientInfo.full_name || 'Cliente Local'}</h4>
              <p className="text-sm text-gray-300">{clientInfo.phone}</p>
              {clientInfo.address && <p className="text-xs text-gray-400 mt-1">{clientInfo.address}</p>}
              
              {clientInfo.is_registered && (
                <div className="mt-3 pt-3 border-t border-green-500/20 flex justify-between items-center">
                  <span className="text-xs text-green-500/70 uppercase font-bold tracking-wider">Fidelidad</span>
                  <span className="font-mono font-bold text-yellow-400">{clientInfo.points || 0} pts</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-800 space-y-2">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Método de Entrega</h4>
            {(['local', 'pickup', 'delivery'] as const).map(method => (
              <button 
                key={method}
                onClick={() => setDeliveryMethod(method)}
                className={`w-full py-2.5 px-3 rounded-lg text-sm font-bold flex justify-between items-center transition-all border ${deliveryMethod === method ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800'}`}
              >
                <span>{method === 'local' ? '🍴 Local / Mesa' : method === 'pickup' ? '🛍️ Recogida' : '🛵 Domicilio'}</span>
                {deliveryMethod === method && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. PANEL CENTRAL: PRODUCTOS */}
      <div className="flex-1 bg-[#14141E] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex overflow-x-auto p-2 border-b border-zinc-800 bg-zinc-900/50 hide-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-3 rounded-xl whitespace-nowrap font-bold text-sm transition-all ${activeCategory === cat.id ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400 hover:bg-zinc-800 hover:text-white'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 })}
                className="bg-[#1A1A24] border border-zinc-800 hover:border-green-500/50 p-4 rounded-xl flex flex-col text-left transition-all hover:bg-zinc-800 group"
              >
                <span className="font-bold text-white text-sm leading-tight mb-2 group-hover:text-green-400">{product.name}</span>
                <span className="font-mono text-green-500 font-bold mt-auto">{product.price.toFixed(2)}€</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. PANEL DERECHO: TICKET */}
      <div className="w-[350px] bg-[#14141E] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-sm text-white uppercase tracking-widest">Ticket Actual</h3>
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300">Vaciar</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-[#1A1A24] border border-zinc-800 p-3 rounded-xl flex justify-between items-center group">
              <div className="flex-1 pr-2">
                <p className="text-sm font-bold text-white line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-500">{item.price.toFixed(2)}€/u</p>
              </div>
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                  {item.quantity > 1 ? '−' : '🗑️'}
                </button>
                <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">+</button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 p-6 text-center">
              <span className="text-4xl mb-4">🛒</span>
              <p className="text-sm font-bold">Carrito vacío</p>
              <p className="text-xs mt-1">Selecciona productos del centro</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 text-sm font-bold uppercase">Total</span>
            <span className="text-3xl font-display font-black text-green-500">{getTotal().toFixed(2)}€</span>
          </div>
          
          <button
            onClick={handleProcessOrder}
            disabled={isProcessing || items.length === 0 || !clientInfo}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${isProcessing ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : items.length === 0 || !clientInfo ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]'}`}
          >
            {isProcessing ? 'Procesando...' : 'ENVIAR A COCINA'}
          </button>
          
          {!clientInfo && items.length > 0 && (
            <p className="text-[10px] text-red-400 text-center mt-3 animate-pulse uppercase tracking-wider font-bold">Falta asignar cliente (Paso 1)</p>
          )}
        </div>
      </div>
    </div>
  );
}
