import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { SumUpPaymentModal } from './SumUpPaymentModal';
import { isStoreOpen, generateAvailableTimeSlots } from '../utils/timeUtils';
import { useHardwareBack } from '../utils/useHardwareBack';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  useHardwareBack(true, onClose);
  const { items, getTotal, removeItem, kioskClientInfo, setKioskClientInfo } = useCartStore();
  const { user, profile, updateProfile } = useAuthStore();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [clientName, setClientName] = useState(kioskClientInfo?.name || profile?.full_name || '');
  const [clientPhone, setClientPhone] = useState(kioskClientInfo?.phone || profile?.phone || '');
  let initStreet = '';
  let initNumber = '';
  let initCP = '';
  let initNotes = kioskClientInfo ? 'Local / Mesa' : '';

  if (profile?.address) {
    try {
      const parsed = JSON.parse(profile.address);
      initStreet = parsed.street || '';
      initNumber = parsed.number || '';
      initCP = parsed.cp || '';
      initNotes = parsed.notes || '';
    } catch (e) {
      initStreet = profile.address;
    }
  }

  const [addressStreet, setAddressStreet] = useState(initStreet);
  const [addressNumber, setAddressNumber] = useState(initNumber);
  const [addressCP, setAddressCP] = useState(initCP);
  const [addressNotes, setAddressNotes] = useState(initNotes);
  const [pointsRedeemed, setPointsRedeemed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [minimumOrderError, setMinimumOrderError] = useState(false);
  const [acceptSmallOrderFee, setAcceptSmallOrderFee] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'physical'>('online');
  const [scheduledTime, setScheduledTime] = useState<string>(isStoreOpen() ? 'asap' : (generateAvailableTimeSlots(15)[0] || 'asap'));

  const isOpen = isStoreOpen();
  const availableSlots = generateAvailableTimeSlots(15);

  const subtotal = getTotal();
  
  // Find eligible item for discount (Pizza or Burger)
  const eligibleItems = items.filter(item => 
    item.name.toLowerCase().includes('pizza') || 
    item.name.toLowerCase().includes('burguer')
  );
  const eligibleDiscount = eligibleItems.length > 0 ? Math.min(...eligibleItems.map(i => i.price)) : 0;
  
  const discount = pointsRedeemed && eligibleDiscount > 0 ? eligibleDiscount : 0;
  
  const needsSmallOrderFee = deliveryMethod === 'delivery' && (subtotal - discount) < 10;
  const smallOrderFee = needsSmallOrderFee && acceptSmallOrderFee ? 1.50 : 0;
  const finalTotal = Math.max(0, subtotal - discount) + smallOrderFee;
  
  const userPoints = profile?.points || 0;
  const canRedeem = userPoints >= 25 && eligibleDiscount > 0;
  const pointsEarned = Math.floor(finalTotal / 10) * 4;

  const handleCheckoutClick = () => {
    if (needsSmallOrderFee && !acceptSmallOrderFee) {
      return;
    }

    if (paymentMethod === 'online' || deliveryMethod === 'delivery') {
      setShowPaymentModal(true);
    } else {
      processOrder();
    }
  };

  const processOrder = async () => {
    setIsProcessing(true);
    
    // Geofence Check: strict 10km radius for ALL orders (delivery and pickup)
    const isWithinRange = await new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) {
        setGeofenceError("Tu navegador no soporta geolocalización. Necesitamos validar tu ubicación para asegurar que podrás disfrutar de nuestras pizzas calientes.");
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat1 = position.coords.latitude;
          const lon1 = position.coords.longitude;
          const lat2 = 37.4346; // Caniles Center
          const lon2 = -2.7350;
          
          const R = 6371; // Earth radius km
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          
          if (distance > 10) {
            setGeofenceError(`Estás a ${distance.toFixed(1)} km de Caniles. Nuestro radio máximo para realizar pedidos por la app es de 10 km. Para pedidos excepcionales o de alto volumen, contáctanos.`);
            resolve(false);
          } else {
            resolve(true);
          }
        },
        (error) => {
          console.error(error);
          setGeofenceError("Necesitamos acceso a tu ubicación para verificar el radio de cobertura de Néstor Pizzas. Por favor, actívala en tu navegador.");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    if (!isWithinRange) {
      setIsProcessing(false);
      return;
    }

    // Generate the final address string to save
    const finalDeliveryAddress = deliveryMethod === 'delivery' 
      ? `${addressStreet}, Nº ${addressNumber}, CP ${addressCP} Caniles${addressNotes ? '. Notas: ' + addressNotes : ''}`
      : addressNotes ? `Notas/Mesa: ${addressNotes}` : 'Recogida en local';


    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        product_id: typeof item.productId === 'number' ? item.productId : null,
        quantity: item.quantity,
        unit_price: item.price,
        customization_details: { 
          name: item.name, 
          notes: item.notes, 
          extras: item.extras, 
          size: item.size 
        }
      }));

      // Insert Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          total_amount: finalTotal,
          status: 'pending',
          client_name: clientName,
          client_phone: clientPhone,
          delivery_address: finalDeliveryAddress,
          delivery_method: deliveryMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert Items with the new order ID
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: orderData.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsWithOrderId);

      if (itemsError) throw itemsError;

      // Si el usuario está autenticado, sumarle los puntos y actualizar sus datos
      if (user && profile) {
        const newPoints = profile.points + pointsEarned;
        // Si canjeó puntos (25 pts), restarlos.
        const finalPoints = pointsRedeemed ? newPoints - 25 : newPoints;
        
        await supabase
          .from('profiles')
          .update({ 
            points: finalPoints,
            phone: clientPhone,
            address: JSON.stringify({ street: addressStreet, number: addressNumber, cp: addressCP, notes: addressNotes }),
            full_name: clientName
          })
          .eq('id', user.id);
          
        // Recargar perfil local y cargar pedidos para que el tracker funcione de inmediato
        useAuthStore.getState().fetchProfile(user.id);
        useAuthStore.getState().fetchOrders();
      }

      // Clear kiosk data if used
      if (kioskClientInfo) {
        setKioskClientInfo(undefined);
      }

      onSuccess();
    } catch (error) {
      console.error('Error procesando pedido:', error);
      alert('Hubo un error procesando el pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      
      {geofenceError && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h3 className="font-display font-black text-2xl text-white mb-2 uppercase tracking-wide">¡Estás un poco lejos!</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed font-medium">
              {geofenceError}
            </p>
            <div className="space-y-3">
              <a href="tel:+34679761987" className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                Llamar Ahora
              </a>
              <button onClick={() => setGeofenceError(null)} className="block w-full bg-transparent hover:bg-zinc-900 text-zinc-500 font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all border border-zinc-800">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[94vh] animate-fade text-white relative">
        <div className="p-4 pt-6 sm:p-6 sm:pt-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 relative overflow-hidden gap-3">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/10 via-green-500/10 to-transparent pointer-events-none"></div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-display font-bold text-green-500 uppercase tracking-widest block">Pasarela Oficial de Pedidos Caniles</span>
            <h3 className="font-display font-black text-xl sm:text-3xl text-white mt-0.5 uppercase">Resumen y Tramitación</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl font-bold p-2 bg-zinc-900 rounded-2xl border border-zinc-800 shrink-0">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm sm:text-sm text-zinc-300 no-scrollbar">
          {/* Artículos Seleccionados */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <span className="font-display font-bold text-white text-sm sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <span>Artículos en tu Comanda</span>
                <span className="text-green-500 font-bold text-sm">{items.length} Artículos</span>
              </span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800 group">
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className="font-bold text-white text-sm truncate">{item.quantity}x {item.name}</span>
                    <span className="text-xs text-zinc-400">{item.size === 'maxi' ? 'Tamaño: MAXI PIZZA' : 'Tamaño: Normal'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-white">{(item.price * item.quantity).toFixed(2)} €</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-500/80 text-zinc-500 hover:text-white flex items-center justify-center transition-all shrink-0"
                      title="Eliminar artículo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Puntos Club VIP */}
          {user ? (
            <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-yellow-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white font-display font-bold flex items-center justify-center text-sm shrink-0 shadow">VIP</div>
                <div>
                  <span className="font-bold text-white block text-sm sm:text-sm">Club Fidelización Caniles: <span className="text-yellow-400 font-display font-extrabold">{userPoints}</span> Puntos</span>
                  <span className="text-[11px] sm:text-sm text-zinc-400 leading-tight block">
                    {eligibleDiscount > 0 ? (
                      <>Canjea 25 ptos para obtener un descuento de <strong className="text-green-400">-{eligibleDiscount.toFixed(2)} €</strong></>
                    ) : (
                      <>Añade una pizza o hamburguesa para canjear tus puntos.</>
                    )}
                  </span>
                  <span className="text-[10px] text-green-400 font-bold block mt-0.5">Sumarás +{pointsEarned} pts con este pedido</span>
                </div>
              </div>
              <button 
                onClick={() => setPointsRedeemed(!pointsRedeemed)}
                disabled={!canRedeem && !pointsRedeemed}
                className={`w-full sm:w-auto justify-center font-display font-bold px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider shrink-0 transition-all border ${pointsRedeemed ? 'bg-green-600 text-white border-green-500' : (canRedeem ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed')}`}
              >
                {pointsRedeemed ? 'Puntos Canjeados ✓' : 'Canjear 25 ptos'}
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-white block text-sm">¿Tienes cuenta VIP?</span>
                <span className="text-xs text-zinc-400 block">Inicia sesión para canjear o sumar puntos.</span>
              </div>
            </div>
          )}

          {/* Método Entrega */}
          <div className="space-y-2.5 sm:space-y-3">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">1. Modalidad de Entrega o Recogida</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 font-medium">
              <label onClick={() => setDeliveryMethod('delivery')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer shadow transition-all ${deliveryMethod === 'delivery' ? 'border-2 border-green-500 bg-green-500/15' : 'border border-zinc-700 bg-zinc-800 hover:border-green-500'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'delivery'} readOnly className="text-green-500 w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-sm sm:text-sm">Envío a Domicilio en Caniles</span>
                    <span className="text-[10px] sm:text-[11px] text-green-400 font-bold">Reparto Gratuito</span>
                  </div>
                </div>
              </label>
              <label onClick={() => setDeliveryMethod('pickup')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'border-2 border-green-500 bg-green-500/15' : 'border border-zinc-700 bg-zinc-800 hover:border-green-500'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'pickup'} readOnly className="text-green-500 w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-sm sm:text-sm">Recoger en Pizzería</span>
                    <span className="text-[10px] sm:text-[11px] text-zinc-400">Calle Alcalde Felip, 9</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Datos de Envío */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">2. Datos de Contacto y Entrega</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium mb-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej. Carlos Mendoza" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Móvil WhatsApp <span className="text-red-500">*</span></label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ej. 679 00 00 00" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-medium">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Calle Exacta <span className="text-red-500">*</span></label>
                  <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Ej. Calle Amapola" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Nº <span className="text-red-500">*</span></label>
                  <input type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="1" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">CP <span className="text-red-500">*</span></label>
                  <input type="text" value={addressCP} onChange={e => setAddressCP(e.target.value)} placeholder="18810" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Notas (Opcional)</label>
                  <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Piso, puerta..." className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
                </div>
              </div>
            ) : (
              <div className="font-medium">
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Notas o Mesa (Opcional)</label>
                <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. Mesa 3 o Llegaré en 15 mins" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
            )}
          </div>

          {/* Cuándo lo quieres */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">3. Cuándo lo quieres</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium">
              <label onClick={() => isOpen && setScheduledTime('asap')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${scheduledTime === 'asap' ? 'bg-green-500/10 border border-green-500/50' : 'bg-zinc-950 border border-zinc-800'} ${!isOpen ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}`}>
                <input type="radio" checked={scheduledTime === 'asap'} readOnly disabled={!isOpen} className="text-green-500 w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold text-white text-sm block">Lo antes posible</span>
                  <span className="text-xs text-zinc-400">{isOpen ? 'Prepárenlo ya' : 'Local Cerrado Ahora'}</span>
                </div>
              </label>

              <label onClick={() => availableSlots.length > 0 && scheduledTime === 'asap' && setScheduledTime(availableSlots[0])} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${scheduledTime !== 'asap' ? 'bg-blue-500/10 border border-blue-500/50' : 'bg-zinc-950 border border-zinc-800'} ${availableSlots.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}`}>
                <input type="radio" checked={scheduledTime !== 'asap'} readOnly disabled={availableSlots.length === 0} className="text-blue-500 w-4 h-4 shrink-0" />
                <div className="w-full pr-2">
                  <span className="font-bold text-white text-sm block">Programar</span>
                  {scheduledTime !== 'asap' && availableSlots.length > 0 ? (
                    <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1.5 block w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-zinc-400">{availableSlots.length > 0 ? 'Elegir hora' : 'Sin turnos hoy'}</span>
                  )}
                </div>
              </label>
            </div>
            {!isOpen && availableSlots.length === 0 && (
              <p className="text-[10px] text-orange-400">El local está cerrado y no hay más turnos por hoy.</p>
            )}
          </div>

          {/* Forma de Pago */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">4. Forma de Pago</span>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
              {deliveryMethod === 'delivery' ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">Pagar con Tarjeta</span>
                      <span className="text-xs text-zinc-400">Pago online para envíos a domicilio</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">VISA</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">MASTERCARD</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">G Pay</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Apple Pay</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 mt-1">
                    🔒 Serás redirigido a la pasarela de pago segura de SumUp para completar tu pedido.
                  </p>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <label onClick={() => setPaymentMethod('online')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'online' ? 'bg-blue-500/10 border border-blue-500/50' : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}`}>
                    <input type="radio" checked={paymentMethod === 'online'} readOnly className="text-blue-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white text-sm block">Pagar con Tarjeta (Online)</span>
                      <span className="text-xs text-zinc-400">Paga ahora y solo ven a recoger</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">VISA</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">MASTER</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">G Pay</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Apple Pay</span>
                      </div>
                    </div>
                  </label>
                  <label onClick={() => setPaymentMethod('physical')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'physical' ? 'bg-green-500/10 border border-green-500/50' : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}`}>
                    <input type="radio" checked={paymentMethod === 'physical'} readOnly className="text-green-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white text-sm block">Pago Físico al Recoger</span>
                      <span className="text-xs text-zinc-400">Paga con Tarjeta o Efectivo en local</span>
                    </div>
                  </label>
                  <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 mt-1">
                    🔒 Tu pedido queda confirmado al instante.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-950 text-white border-t border-zinc-800">
          {needsSmallOrderFee && (
            <div className="mb-4 bg-orange-500/10 border border-orange-500/30 text-orange-400 p-3 sm:p-4 rounded-xl flex flex-col gap-2 transition-all">
              <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>El pedido mínimo para envíos a domicilio gratuitos es de <strong>10.00 €</strong>.</span>
              </div>
              <label className="flex items-center gap-3 mt-1 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={acceptSmallOrderFee} 
                  onChange={(e) => setAcceptSmallOrderFee(e.target.checked)} 
                  className="w-4 h-4 text-orange-500 rounded border-orange-500/50 bg-black/50 cursor-pointer focus:ring-orange-500" 
                />
                <span className="text-xs sm:text-sm text-orange-200 group-hover:text-orange-100 transition-colors">Aceptar recargo de 1.50 € por pedido pequeño</span>
              </label>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total a Abonar</span>
              <span className="font-display font-black text-2xl sm:text-3xl text-white">{finalTotal.toFixed(2)} €</span>
            </div>
            <button 
              disabled={isProcessing || !clientName || !clientPhone || (deliveryMethod === 'delivery' && (!addressStreet || !addressNumber || !addressCP)) || (needsSmallOrderFee && !acceptSmallOrderFee) || (!isOpen && availableSlots.length === 0)}
              onClick={handleCheckoutClick} 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-orange-600 hover:to-orange-700 text-white font-display font-bold px-8 py-4 rounded-2xl shadow-[0_15px_30px_-5px_rgba(22,163,74,0.4)] uppercase tracking-wider text-sm sm:text-sm transition-all hover:scale-105 shrink-0 disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : (paymentMethod === 'online' || deliveryMethod === 'delivery' ? 'Pagar Online →' : 'Confirmar Pedido →')}
            </button>
          </div>
        </div>

        {isProcessing && !showPaymentModal && (
          <div className="absolute inset-0 z-[1200] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] animate-fade-in">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-green-500 font-bold uppercase tracking-widest animate-pulse">Confirmando Pedido...</p>
          </div>
        )}
      </div>

      <SumUpPaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        onSuccess={processOrder} 
        amount={finalTotal} 
      />
    </div>
  );
}
