import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Recalcula el total AQUÍ, con precios reales de la base de datos — nunca se
// confía en lo que el navegador afirme que cuesta el pedido. El importe que
// se le pide a SumUp que cobre es siempre este, no el que llegó en el body.
// El umbral y el recargo de pedido mínimo se leen en vivo de `store_settings`
// (igual que ahora hace `process_checkout`) — nunca hardcodeados, para que
// un cambio futuro en el panel de admin se refleje aquí automáticamente.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const {
    items, deliveryMethod, clientName, clientPhone, deliveryAddress,
    notes, pointsRedeemed, acceptSmallOrderFee, userId
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }
  if (!clientName || !clientPhone || !deliveryAddress || deliveryMethod !== 'delivery') {
    return res.status(400).json({ error: 'Faltan datos del pedido.' });
  }

  const authHeaderIn = req.headers.authorization || '';
  const callerToken = authHeaderIn.startsWith('Bearer ') ? authHeaderIn.slice(7) : null;

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: callerToken ? { headers: { Authorization: `Bearer ${callerToken}` } } : undefined
  });

  // Si el pedido dice ser de un usuario logueado, comprobamos que quien llama
  // de verdad es ese usuario — igual que la comprobación ya existente en
  // process_checkout, pero aquí también, antes incluso de cobrar nada.
  let verifiedUserId = null;
  let verifiedUserEmail = null;
  if (userId) {
    if (!callerToken) {
      return res.status(401).json({ error: 'Sesión requerida para operar con tu cuenta.' });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    verifiedUserId = user.id;
    verifiedUserEmail = user.email || null;
  }

  // 1) Precios reales de catálogo — todo ítem debe mapear a un producto real
  //    y activo. El pago con tarjeta no admite precios sueltos/manuales
  //    (eso queda reservado al Kiosko, uso exclusivo de personal autenticado).
  const productIds = items
    .map(i => (typeof i.productId === 'number' && i.productId < 1000 ? i.productId : null))
    .filter(id => id !== null);

  if (productIds.length !== items.length) {
    return res.status(400).json({ error: 'El pago online solo admite productos del catálogo.' });
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, price, name, is_active, jueves_promo_eligible')
    .in('id', productIds);

  if (productsError) {
    return res.status(500).json({ error: 'No se pudo verificar el catálogo.' });
  }

  // Igual que process_checkout: el jueves, un producto marcado como elegible
  // para la oferta (jueves_promo_eligible) y etiquetado como "(Promo Jueves)"
  // por el modal de la oferta se cobra a 5.50€ en vez del precio de catálogo.
  // Nunca se confía en un precio suelto que mande el navegador -- solo se
  // activa este precio fijo bajo esas dos condiciones verificadas aquí.
  const madridWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(new Date());
  const isThursdayInMadrid = madridWeekday === 'Thursday';
  const JUEVES_PROMO_PRICE = 5.50;

  const productsById = new Map((products || []).map(p => [p.id, p]));
  let subtotal = 0;
  let eligibleDiscount = 0;
  let redeemTargetChosen = false;
  // Guardado por posición para reutilizar el mismo precio (ya con el
  // descuento de Jueves Locos aplicado si toca) al construir el pedido
  // pendiente más abajo — así el importe que cobra SumUp y el que queda
  // grabado en `orders`/`order_items` cuando el webhook confirme el pago
  // son siempre el mismo número, nunca dos cálculos que puedan divergir.
  const unitPricesByIndex = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const product = productsById.get(item.productId);
    if (!product || !product.is_active) {
      return res.status(409).json({ error: `El producto "${item.name || item.productId}" ya no está disponible.` });
    }
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida en el pedido.' });
    }

    const itemLabel = String(item.name || item.customization_details?.name || '');
    const isJuevesPromoItem = isThursdayInMadrid && product.jueves_promo_eligible === true && itemLabel.includes('(Promo Jueves)');
    const unitPrice = isJuevesPromoItem ? JUEVES_PROMO_PRICE : product.price;
    unitPricesByIndex[index] = unitPrice;

    subtotal += unitPrice * qty;

    if (pointsRedeemed) {
      const nameLower = (product.name || '').toLowerCase();
      if (nameLower.includes('pizza') || nameLower.includes('burguer')) {
        if (item.redeem_target === true) {
          eligibleDiscount = unitPrice;
          redeemTargetChosen = true;
        } else if (!redeemTargetChosen && (eligibleDiscount === 0 || unitPrice < eligibleDiscount)) {
          eligibleDiscount = unitPrice;
        }
      }
    }
  }

  // 2) Elegibilidad real de canje de puntos VIP (25+ puntos reales en el perfil, único).
  let discount = 0;
  if (pointsRedeemed && verifiedUserId && eligibleDiscount > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', verifiedUserId)
      .single();
    if (profile && profile.points >= 25) {
      discount = eligibleDiscount;
    }
  }

  // 3) Recargo por pedido pequeño — mismo umbral/importe configurados en
  //    Ajustes (store_settings), leídos en vivo, igual que process_checkout.
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('delivery_fee, min_order_delivery')
    .eq('id', 1)
    .single();

  const minOrderDelivery = Number(storeSettings?.min_order_delivery ?? 10);
  const deliveryFee = Number(storeSettings?.delivery_fee ?? 1);

  const afterDiscount = Math.max(0, subtotal - discount);
  let smallOrderFee = 0;
  if (afterDiscount < minOrderDelivery && acceptSmallOrderFee) {
    smallOrderFee = deliveryFee;
  }

  const amount = Math.round((afterDiscount + smallOrderFee) * 100) / 100;

  if (amount < 0.50) {
    return res.status(400).json({ error: 'El importe del pedido es demasiado bajo para procesar el pago.' });
  }

  // 4) Guardamos el pedido "pendiente de pago" — el pedido real en `orders`
  //    NO se crea aquí, solo cuando el webhook confirme el pago con SumUp.
  const checkoutReference = randomUUID();
  const orderPayload = {
    p_user_id: verifiedUserId,
    p_client_name: clientName,
    p_client_phone: clientPhone,
    p_delivery_address: deliveryAddress,
    p_delivery_method: deliveryMethod,
    p_items: items.map((item, index) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: unitPricesByIndex[index],
      redeem_target: !!item.redeem_target,
      customization_details: item.customization_details || { name: item.name, notes: item.notes, extras: item.extras }
    })),
    p_points_redeemed: !!discount,
    p_small_order_fee_accepted: !!acceptSmallOrderFee,
    p_ip_address: 'client',
    p_notes: notes || null,
    p_payment_method: 'online'
  };

  const { error: pendingError } = await supabase.rpc('sumup_create_pending_checkout', {
    p_checkout_reference: checkoutReference,
    p_amount: amount,
    p_order_payload: orderPayload,
    p_client_email: verifiedUserEmail
  });

  if (pendingError) {
    console.error('Error creando checkout pendiente:', pendingError);
    return res.status(500).json({ error: 'No se pudo iniciar el pago.' });
  }

  // 5) Crear el Checkout alojado por SumUp — el pago ocurre en su página,
  //    nunca en la nuestra. La clave secreta solo vive aquí, en el servidor.
  const origin = `https://${req.headers.host}`;
  let sumupRes;
  try {
    sumupRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUMUP_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkout_reference: checkoutReference,
        amount,
        currency: 'EUR',
        merchant_code: process.env.SUMUP_MERCHANT_CODE,
        description: `Pedido Néstor Pizzas - ${clientName}`,
        redirect_url: `${origin}/pago-verificando?ref=${checkoutReference}`,
        return_url: `${origin}/api/sumup-webhook`,
        hosted_checkout: { enabled: true }
      })
    });
  } catch (err) {
    console.error('Error de red creando checkout en SumUp:', err);
    return res.status(502).json({ error: 'No se pudo contactar con la pasarela de pago.' });
  }

  if (!sumupRes.ok) {
    const errBody = await sumupRes.text();
    console.error('SumUp rechazó la creación del checkout:', sumupRes.status, errBody);
    return res.status(502).json({ error: 'La pasarela de pago rechazó la solicitud.' });
  }

  const sumupData = await sumupRes.json();

  await supabase.rpc('sumup_attach_sumup_id', {
    p_checkout_reference: checkoutReference,
    p_sumup_checkout_id: sumupData.id
  });

  return res.status(200).json({
    checkoutReference,
    amount,
    hostedCheckoutUrl: sumupData.hosted_checkout_url
  });
}
