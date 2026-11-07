import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { isStoreOpen, generateAvailableTimeSlots } from '../utils/timeUtils';
import { useHardwareBack } from '../utils/useHardwareBack';
import { emailService } from '../lib/emailService';
import { useI18nStore } from '../store/i18nStore';
import { useSettingsStore } from '../store/settingsStore';
import { getCachedCatalogData } from '../lib/catalogPreload';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (orderData: any, isGuest: boolean) => void;
}

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic } = useI18nStore();
  const { items, getTotal, removeItem, kioskClientInfo, setKioskClientInfo } = useCartStore();
  const { user, profile, updateProfile } = useAuthStore();
  const {
    deliveryFee,
    minOrderDelivery,
    allowDelivery,
    deliveryAllowCard,
    deliveryAllowCash,
    allowPickup,
    pickupAllowCard,
    pickupAllowCash
  } = useSettingsStore();

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>(() => {
    if (allowDelivery) return 'delivery';
    if (allowPickup) return 'pickup';
    return 'delivery';
  });

  const canPayCard = deliveryMethod === 'delivery' ? deliveryAllowCard : pickupAllowCard;
  const canPayCash = deliveryMethod === 'delivery' ? deliveryAllowCash : pickupAllowCash;

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'physical'>(() => {
    return canPayCard ? 'online' : 'physical';
  });

  useEffect(() => {
    if (deliveryMethod === 'delivery') {
      if (!deliveryAllowCard && deliveryAllowCash) setPaymentMethod('physical');
      else if (deliveryAllowCard && !deliveryAllowCash) setPaymentMethod('online');
    } else {
      if (!pickupAllowCard && pickupAllowCash) setPaymentMethod('physical');
      else if (pickupAllowCard && !pickupAllowCash) setPaymentMethod('online');
    }
  }, [deliveryMethod, deliveryAllowCard, deliveryAllowCash, pickupAllowCard, pickupAllowCash]);

  useEffect(() => {
    if (deliveryMethod === 'delivery' && !allowDelivery && allowPickup) {
      setDeliveryMethod('pickup');
    } else if (deliveryMethod === 'pickup' && !allowPickup && allowDelivery) {
      setDeliveryMethod('delivery');
    }
  }, [deliveryMethod, allowDelivery, allowPickup]);
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
  const [orderNotes, setOrderNotes] = useState('');
  const [pointsRedeemed, setPointsRedeemed] = useState(false);
  const [redeemItemId, setRedeemItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [minimumOrderError, setMinimumOrderError] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>(isStoreOpen() ? 'asap' : (generateAvailableTimeSlots(15)[0] || 'asap'));

  const isOpen = isStoreOpen();
  const availableSlots = generateAvailableTimeSlots(15);

  const subtotal = getTotal();
  
  // Productos elegibles para el descuento VIP (Solo Pizzas Sugerencia: NUESTRAS PIZZAS y PIZZAS BLANCAS, nunca hamburguesas ni postres).
  const catalogProducts = getCachedCatalogData()?.products || [];
  const eligibleItems = items.filter(item => {
    const nameLower = String(item.name || '').toLowerCase();
    if (nameLower.includes('(promo jueves)') || nameLower.includes('dulce') || nameLower.includes('burguer')) {
      return false;
    }
    const prod = catalogProducts.find((p: any) => Number(p.id) === Number(item.productId));
    if (prod) {
      return prod.jueves_promo_eligible === true || prod.category_id === 'NUESTRAS PIZZAS' || prod.category_id === 'PIZZAS BLANCAS';
    }
    const pid = Number(item.productId);
    if ((pid >= 1 && pid <= 16) || (pid >= 19 && pid <= 21)) {
      return true;
    }
    return nameLower.includes('pizza');
  });
  const selectedRedeemItem = eligibleItems.find(i => i.id === redeemItemId)
    || (eligibleItems.length > 0 ? eligibleItems.reduce((cheapest, i) => i.price < cheapest.price ? i : cheapest) : null);
  const eligibleDiscount = selectedRedeemItem ? selectedRedeemItem.price : 0;

  const discount = pointsRedeemed && eligibleDiscount > 0 ? eligibleDiscount : 0;
  
  const isUnderMinimum = deliveryMethod === 'delivery' && (subtotal - discount) < minOrderDelivery;
  const missingAmount = Math.max(0, minOrderDelivery - (subtotal - discount));
  const activeDeliveryFee = deliveryMethod === 'delivery' ? Math.max(0, Number(deliveryFee || 0)) : 0;
  const finalTotal = Math.max(0, subtotal - discount) + activeDeliveryFee;
  
  const userPoints = profile?.points || 0;
  const canRedeem = userPoints >= 20 && eligibleDiscount > 0;
  const pointsEarned = Math.floor(finalTotal / 10) * 2;

  useEffect(() => {
    if (canRedeem && sessionStorage.getItem('nestor_auto_redeem_vip') === 'true') {
      setPointsRedeemed(true);
      sessionStorage.removeItem('nestor_auto_redeem_vip');
    }
  }, [canRedeem]);

  const validateGeofence = async (): Promise<boolean> => {
    // Domicilio estrictamente en Caniles (CP 18810) sin bloqueo por antenas GPS móviles
    if (deliveryMethod === 'delivery') {
      const cleanCP = addressCP.trim();
      if (cleanCP !== '18810') {
        setGeofenceError('El reparto a domicilio opera exclusivamente en Caniles (CP 18810).');
        return false;
      }
    }
    return true;
  };

  const handleCheckoutClick = async () => {
    setPaymentError(null);
    if (isUnderMinimum) {
      setPaymentError(`El pedido mínimo para envíos a domicilio en Caniles es de ${minOrderDelivery.toFixed(2)} €. Te faltan ${missingAmount.toFixed(2)} €.`);
      return;
    }

    if (deliveryMethod === 'delivery') {
      setIsProcessing(true);
      const isWithinRange = await validateGeofence();
      setIsProcessing(false);

      if (!isWithinRange) {
        return;
      }
    }

    if (paymentMethod === 'online') {
      initiateOnlinePayment();
    } else {
      processOrder();
    }
  };

  const initiateOnlinePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);

    const finalDeliveryAddress = deliveryMethod === 'delivery'
      ? `${addressStreet}, Nº ${addressNumber}, CP ${addressCP} Caniles${addressNotes ? '. Notas: ' + addressNotes : ''}`
      : 'Recogida en local (C. Alcalde Felip, 9 Caniles)';
    const finalOrderNotes = [
      scheduledTime !== 'asap' ? `⏰ Programado: ${scheduledTime}` : '',
      addressNotes ? `Dir/Mesa: ${addressNotes}` : '',
      orderNotes.trim() ? `📝 ${orderNotes.trim()}` : ''
    ].filter(Boolean).join(' | ');

    const orderItems = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      unit_price: item.price,
      name: item.name,
      redeem_target: !!(pointsRedeemed && selectedRedeemItem && item.id === selectedRedeemItem.id),
      customization_details: {
        name: item.name,
        notes: item.notes,
        extras: item.extras,
        size: item.size
      }
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/sumup-create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          items: orderItems,
          deliveryMethod,
          clientName,
          clientPhone,
          deliveryAddress: finalDeliveryAddress,
          notes: finalOrderNotes || null,
          pointsRedeemed,
          acceptSmallOrderFee: false,
          userId: user?.id || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo iniciar el pago.');
      }

      // Redirige a la página de pago alojada por SumUp
      window.location.href = result.hostedCheckoutUrl;
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err.message || 'No se pudo iniciar el pago online. Inténtalo de nuevo.');
    }
  };

  const processOrder = async () => {
    setIsProcessing(true);
    
    const finalDeliveryAddress = deliveryMethod === 'delivery' 
      ? `${addressStreet}, Nº ${addressNumber}, CP ${addressCP} Caniles${addressNotes ? '. Notas: ' + addressNotes : ''}`
      : addressNotes ? `Recogida Caniles (C. Alcalde Felip, 9). Notas: ${addressNotes}` : 'Recogida en local Caniles (C. Alcalde Felip, 9 — 18810)';

    try {
      const orderItems = items.map(item => ({
        product_id: typeof item.productId === 'number' && item.productId < 100000 ? item.productId : null,
        quantity: item.quantity,
        unit_price: item.price,
        redeem_target: !!(pointsRedeemed && selectedRedeemItem && item.id === selectedRedeemItem.id),
        customization_details: {
          name: item.name,
          notes: item.notes,
          extras: item.extras,
          size: item.size
        }
      }));

      const finalOrderNotes = [
        scheduledTime !== 'asap' ? `⏰ Programado: ${scheduledTime}` : '',
        addressNotes ? `Dir/Mesa: ${addressNotes}` : '',
        orderNotes.trim() ? `📝 ${orderNotes.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const { data: orderId, error: checkoutError } = await supabase.rpc('process_checkout', {
        p_user_id: user?.id || null,
        p_client_name: clientName,
        p_client_phone: clientPhone,
        p_delivery_address: finalDeliveryAddress,
        p_delivery_method: deliveryMethod,
        p_items: orderItems,
        p_points_redeemed: pointsRedeemed,
        p_small_order_fee_accepted: false,
        p_ip_address: 'client',
        p_notes: finalOrderNotes || null,
        p_payment_method: paymentMethod
      });

      if (checkoutError) throw checkoutError;

      if (user && profile) {
        await supabase
          .from('profiles')
          .update({ 
            phone: clientPhone,
            address: JSON.stringify({ street: addressStreet, number: addressNumber, cp: addressCP, notes: addressNotes }),
            full_name: clientName,
            email: user.email
          })
          .eq('id', user.id);
          
        useAuthStore.getState().fetchProfile(user.id);
        useAuthStore.getState().fetchOrders();
      }

      if (kioskClientInfo) {
        setKioskClientInfo(undefined);
      }

      const orderDataForEmail = { id: orderId, total: finalTotal, clientName: clientName };
      if (user?.email) emailService.sendOrderConfirmation(user.email, orderDataForEmail);
      emailService.sendOrderToAdmin(orderDataForEmail);

      useCartStore.getState().clearCart();
      if (!user) {
        useGuestOrderStore.getState().addGuestOrder({
          id: String(orderId),
          total_amount: finalTotal,
          status: 'pending',
          delivery_method: deliveryMethod,
          delivery_address: finalDeliveryAddress,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          client_name: clientName,
          order_items: items.map(item => ({
            id: `${item.productId}-${Date.now()}`,
            quantity: item.quantity,
            products: { name: item.name },
            customization_details: { name: item.name }
          }))
        });
      }

      onSuccess({ id: orderId, total_amount: finalTotal, clientName: clientName }, !user);
    } catch (error: any) {
      console.error('Error procesando pedido:', error);
      const friendlyMsg = error?.message?.includes('Manipulación') 
        ? t('error_integrity')
        : error?.message?.includes('Demasiados pedidos')
        ? t('error_too_many')
        : error?.message?.includes('ya no está disponible')
        ? t('error_unavailable')
        : t('error_processing');
      setPaymentError(friendlyMsg);
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
            <h3 className="font-display font-black text-2xl text-white mb-2 uppercase tracking-wide">{t('far_away_title')}</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed font-medium">
              {geofenceError}
            </p>
            <div className="space-y-3">
              <a href="tel:+34679761987" className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                {t('call_now')}
              </a>
              <button onClick={() => setGeofenceError(null)} className="block w-full bg-transparent hover:bg-zinc-900 text-zinc-500 font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all border border-zinc-800">
                {t('understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[94vh] animate-fade text-white relative">
        <div className="p-4 pt-6 sm:p-6 sm:pt-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 relative overflow-hidden gap-3 shrink-0">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/10 via-green-500/10 to-transparent pointer-events-none"></div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-display font-bold text-green-500 uppercase tracking-widest block">{t('official_checkout')}</span>
            <h3 className="font-display font-black text-xl sm:text-3xl text-white mt-0.5 uppercase">{t('checkout_summary')}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl font-bold p-2 bg-zinc-900 rounded-2xl border border-zinc-800 shrink-0 z-10 relative">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm sm:text-sm text-zinc-300 no-scrollbar">
          
          {paymentError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center animate-fade-in">
              <span className="text-2xl mb-2 block">⚠️</span>
              <p className="text-red-400 font-medium text-sm">{paymentError}</p>
            </div>
          )}

          {/* Artículos Seleccionados */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <span className="font-display font-bold text-white text-sm sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <span>{t('items_in_order')}</span>
                <span className="text-green-500 font-bold text-sm">{items.length} {t('items_count')}</span>
              </span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800 group">
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className="font-bold text-white text-sm truncate">{item.quantity}x {tDynamic(item.name)}</span>
                    <span className="text-xs text-zinc-400">{item.size === 'maxi' ? t('size_maxi') : t('size_normal')}</span>
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
            <>
            <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-yellow-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white font-display font-bold flex items-center justify-center text-sm shrink-0 shadow">VIP</div>
                <div>
                  <span className="font-bold text-white block text-sm sm:text-sm">{t('vip_club')} <span className="text-yellow-400 font-display font-extrabold">{userPoints}</span> {t('points')}</span>
                  <span className="text-[11px] sm:text-sm text-zinc-400 leading-tight block">
                    {eligibleDiscount > 0 ? (
                      <>{t('redeem_25')} <strong className="text-green-400">-{eligibleDiscount.toFixed(2)} €</strong></>
                    ) : (
                      <>{t('add_pizza_redeem')}</>
                    )}
                  </span>
                  <span className="text-[10px] text-green-400 font-bold block mt-0.5">{t('earn_points')} +{pointsEarned} {t('with_this_order')}</span>
                </div>
              </div>
              <button
                onClick={() => setPointsRedeemed(!pointsRedeemed)}
                disabled={!canRedeem && !pointsRedeemed}
                className={`w-full sm:w-auto justify-center font-display font-bold px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider shrink-0 transition-all border ${pointsRedeemed ? 'bg-green-600 text-white border-green-500' : (canRedeem ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed')}`}
              >
                {pointsRedeemed ? t('redeemed_btn') : t('redeem_btn')}
              </button>
            </div>
            {pointsRedeemed && eligibleItems.length > 1 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 -mt-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">{t('choose_redeem_item')}</p>
                <div className="flex flex-wrap gap-2">
                  {eligibleItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRedeemItemId(item.id)}
                      className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                        selectedRedeemItem?.id === item.id
                          ? 'bg-green-600 text-white border-green-500'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {item.name} · {item.price.toFixed(2)}€
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block text-sm">{t('have_vip')}</span>
                <span className="text-xs text-zinc-400 block mt-0.5">{t('login_to_redeem')}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    useAuthStore.getState().openUserModal('login');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded-xl transition-colors border border-zinc-700"
                >
                  {t('login')}
                </button>
                <button 
                  onClick={() => {
                    useAuthStore.getState().openUserModal('register');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold uppercase rounded-xl transition-colors shadow-lg shadow-yellow-500/20"
                >
                  {t('register')}
                </button>
              </div>
            </div>
          )}

          {/* Método Entrega (Configurado en vivo por el Admin) */}
          <div className="space-y-2.5 sm:space-y-3">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">{t('delivery_mode')}</span>
            
            {allowDelivery && allowPickup ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 font-medium">
                <label onClick={() => setDeliveryMethod('delivery')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer shadow transition-all ${deliveryMethod === 'delivery' ? 'border-2 border-green-500 bg-green-500/15' : 'border border-zinc-700 bg-zinc-800 hover:border-green-500'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={deliveryMethod === 'delivery'} readOnly className="text-green-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-sm sm:text-sm">{t('delivery_caniles')}</span>
                      <span className="text-[10px] sm:text-[11px] text-green-400 font-bold">{t('free_delivery')}</span>
                    </div>
                  </div>
                </label>
                <label onClick={() => setDeliveryMethod('pickup')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'border-2 border-amber-500 bg-amber-500/15' : 'border border-zinc-700 bg-zinc-800 hover:border-amber-500'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={deliveryMethod === 'pickup'} readOnly className="text-amber-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-sm sm:text-sm">Para Recoger en Caniles</span>
                      <span className="text-[10px] sm:text-[11px] text-zinc-400">C. Alcalde Felip, 9 (18810 Caniles)</span>
                    </div>
                  </div>
                </label>
              </div>
            ) : allowDelivery ? (
              <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-green-500 bg-green-500/15 flex items-center justify-between shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛵</span>
                  <div>
                    <span className="font-bold text-white block text-sm sm:text-sm">{t('delivery_caniles')}</span>
                    <span className="text-[10px] sm:text-[11px] text-green-400 font-bold">Servicio exclusivo a domicilio en Caniles (CP 18810)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30 uppercase tracking-wider">Activo</span>
              </div>
            ) : allowPickup ? (
              <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-amber-500 bg-amber-500/15 flex items-center justify-between shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛍️</span>
                  <div>
                    <span className="font-bold text-white block text-sm sm:text-sm">Para Recoger en Local</span>
                    <span className="text-[10px] sm:text-[11px] text-amber-400 font-bold">C. Alcalde Felip, 9 — Caniles (Listo en ~20-25 min)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase tracking-wider">Activo</span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 text-center font-bold text-sm">
                ⛔ No se aceptan pedidos en este momento por decisión del establecimiento.
              </div>
            )}
          </div>

          {/* Datos de Envío */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">{t('contact_data')}</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium mb-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">{t('full_name')} <span className="text-red-500">*</span></label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('name_placeholder')} className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">{t('mobile_whatsapp')} <span className="text-red-500">*</span></label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ej. 679 00 00 00" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-medium">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">{t('exact_street')} <span className="text-red-500">*</span></label>
                  <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder={t('street_placeholder')} className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
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
                  <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Piso / Puerta</label>
                  <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. 2ºA, Timbre azul" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
                </div>
              </div>
            ) : (
              <div className="font-medium">
                <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Notas para Recogida (Opcional)</label>
                <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. Recoge mi hermano Carlos" className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm sm:text-sm focus:outline-none focus:border-green-500 font-medium" />
              </div>
            )}

            {/* Notas Globales para Cocina / Elaboración */}
            <div className="pt-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                📝 Instrucciones Especiales para Cocina / Reparto (Opcional)
              </label>
              <input 
                type="text" 
                value={orderNotes} 
                onChange={e => setOrderNotes(e.target.value)} 
                placeholder="Ej: Masa fina, cortar en 8 porciones, llamar al móvil al llegar..." 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-white text-sm focus:outline-none focus:border-green-500 font-medium" 
              />
            </div>
          </div>

          {/* Cuándo lo quieres */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">{t('when_want')}</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium">
              <label onClick={() => isOpen && setScheduledTime('asap')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${scheduledTime === 'asap' ? 'bg-green-500/10 border border-green-500/50' : 'bg-zinc-950 border border-zinc-800'} ${!isOpen ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}`}>
                <input type="radio" checked={scheduledTime === 'asap'} readOnly disabled={!isOpen} className="text-green-500 w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold text-white text-sm block">{t('asap')}</span>
                  <span className="text-xs text-zinc-400">{isOpen ? t('prepare_now') : t('closed_now')}</span>
                </div>
              </label>

              <label onClick={() => availableSlots.length > 0 && scheduledTime === 'asap' && setScheduledTime(availableSlots[0])} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${scheduledTime !== 'asap' ? 'bg-blue-500/10 border border-blue-500/50' : 'bg-zinc-950 border border-zinc-800'} ${availableSlots.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}`}>
                <input type="radio" checked={scheduledTime !== 'asap'} readOnly disabled={availableSlots.length === 0} className="text-blue-500 w-4 h-4 shrink-0" />
                <div className="w-full pr-2">
                  <span className="font-bold text-white text-sm block">{t('schedule')}</span>
                  {scheduledTime !== 'asap' && availableSlots.length > 0 ? (
                    <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1.5 block w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-zinc-400">{availableSlots.length > 0 ? t('choose_time') : t('no_slots_today')}</span>
                  )}
                </div>
              </label>
            </div>
            {!isOpen && availableSlots.length === 0 && (
              <p className="text-[10px] text-orange-400">{t('closed_no_slots')}</p>
            )}
          </div>

          {/* Forma de Pago (Dinámica según Ajustes de Néstor) */}
          <div className="space-y-3 border-t border-zinc-800 pt-4 sm:pt-5">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider block">{t('payment_form')}</span>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
              {canPayCard && canPayCash ? (
                <div className="flex flex-col gap-2.5">
                  <label onClick={() => setPaymentMethod('online')} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${paymentMethod === 'online' ? 'bg-blue-500/10 border-2 border-blue-500/60 shadow-lg shadow-blue-500/10' : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}`}>
                    <input type="radio" checked={paymentMethod === 'online'} readOnly className="text-blue-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white text-sm block">Pago con Tarjeta Online</span>
                      <span className="text-xs text-zinc-400">{deliveryMethod === 'delivery' ? 'Cobro online por adelantado vía SumUp' : 'Pagar online antes de recoger'}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">VISA</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">MASTERCARD</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">G Pay</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Apple Pay</span>
                      </div>
                    </div>
                  </label>
                  <label onClick={() => setPaymentMethod('physical')} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${paymentMethod === 'physical' ? 'bg-green-500/10 border-2 border-green-500/60 shadow-lg shadow-green-500/10' : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}`}>
                    <input type="radio" checked={paymentMethod === 'physical'} readOnly className="text-green-500 w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold text-white text-sm block">
                        {deliveryMethod === 'delivery' ? 'Efectivo al Repartidor' : 'Efectivo al Recoger en Mostrador'}
                      </span>
                      <span className="text-xs text-zinc-400">Pagar en mano en el momento de la entrega</span>
                    </div>
                  </label>
                </div>
              ) : canPayCard ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">Pago Seguro con Tarjeta / Apple Pay / G Pay</span>
                      <span className="text-xs text-zinc-400">Pasarela oficial y cifrada SumUp</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">VISA</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">MASTERCARD</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">G Pay</span>
                        <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Apple Pay</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 mt-1">
                    {t('sumup_redirect')}
                  </p>
                </>
              ) : canPayCash ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-600/30 flex items-center justify-center shrink-0">
                    <span className="text-xl">💵</span>
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {deliveryMethod === 'delivery' ? 'Pago en Efectivo al Repartidor' : 'Pago en Efectivo al Recoger'}
                    </span>
                    <span className="text-xs text-zinc-400">Pagar en mano en el momento de la entrega</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-400 text-center font-bold">
                  No hay formas de pago habilitadas para este método.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-950 text-white border-t border-zinc-800">
          {paymentError && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3.5 text-center mb-4 animate-fade-in">
              <p className="text-red-400 font-bold text-xs sm:text-sm">⚠️ {paymentError}</p>
            </div>
          )}
          {isUnderMinimum && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-2 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-red-400">
                    Pedido mínimo para reparto a domicilio: {minOrderDelivery.toFixed(2).replace('.', ',')} €
                  </p>
                  <p className="text-xs text-zinc-300 mt-1">
                    Te faltan <strong className="text-white">{missingAmount.toFixed(2).replace('.', ',')} €</strong> en productos para poder tramitar tu pedido a domicilio en Caniles.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t('total_to_pay')}</span>
              <span className="font-display font-black text-2xl sm:text-3xl text-white">{finalTotal.toFixed(2)} €</span>
            </div>
            <button 
              disabled={isProcessing || !clientName || !clientPhone || (deliveryMethod === 'delivery' && (!addressStreet || !addressNumber || !addressCP)) || isUnderMinimum || (!allowDelivery && !allowPickup) || (!isOpen && availableSlots.length === 0)}
              onClick={handleCheckoutClick} 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-orange-600 hover:to-orange-700 text-white font-display font-bold px-8 py-4 rounded-2xl shadow-[0_15px_30px_-5px_rgba(22,163,74,0.4)] uppercase tracking-wider text-sm sm:text-sm transition-all hover:scale-105 shrink-0 disabled:opacity-50"
            >
              {isProcessing ? t('processing') : (
                isUnderMinimum 
                  ? `Mínimo ${minOrderDelivery.toFixed(2).replace('.', ',')} €`
                  : paymentMethod === 'online'
                  ? t('pay_online_btn')
                  : t('confirm_order_btn')
              )}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 z-[1200] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] animate-fade-in">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-green-500 font-bold uppercase tracking-widest animate-pulse">
              {paymentMethod === 'online' && deliveryMethod === 'delivery' ? 'Redirigiendo a pago seguro...' : t('confirming_order')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
