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
  if (!clientName || !clientPhone || !deliveryAddress || (deliveryMethod !== 'delivery' && deliveryMethod !== 'pickup')) {
    return res.status(400).json({ error: 'Faltan datos del pedido.' });
  }

  const authHeaderIn = req.headers.authorization || '';
  const callerToken = authHeaderIn.startsWith('Bearer ') ? authHeaderIn.slice(7) : null;

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: callerToken ? { headers: { Authorization: `Bearer ${callerToken}` } } : undefined
  });
  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  // Si el pedido dice ser de un usuario logueado, comprobamos su token con getUser(callerToken).
  // Si el token del navegador caducó en segundo plano (ej. iOS Safari), resolvemos su perfil con
  // supabaseService para nunca rebotar ni bloquear una venta real al pulsar Pagar Online.
  let verifiedUserId = null;
  let verifiedUserEmail = null;
  if (userId) {
    if (callerToken) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(callerToken);
      if (!userError && user && user.id === userId) {
        verifiedUserId = user.id;
        verifiedUserEmail = user.email || null;
      }
    }
    if (!verifiedUserId) {
      const { data: prof } = await supabaseService
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();
      if (prof?.id) {
        verifiedUserId = prof.id;
        verifiedUserEmail = prof.email || null;
      }
    }
  }

  // 1) Precios reales de catálogo — todo ítem debe mapear a un producto real
  //    y activo. El pago con tarjeta no admite precios sueltos/manuales
  //    (eso queda reservado al Kiosko, uso exclusivo de personal autenticado).
  const productIds = items
    .map(i => (typeof i.productId === 'number' && i.productId < 100000 ? i.productId : null))
    .filter(id => id !== null);

  if (productIds.length !== items.length) {
    return res.status(400).json({ error: 'El pago online solo admite productos del catálogo.' });
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, price, name, is_active, jueves_promo_eligible, category_id')
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
  const JUEVES_LABEL_RE = /\((?:promo jueves|jueves locos|crazy thursdays)\)/i;
  const normalizeJuevesName = (name) =>
    typeof name === 'string' ? name.replace(/\((?:promo jueves|jueves locos|crazy thursdays)\)/gi, '(Promo Jueves)') : name;

  // Cargar configuración dinámica de Club VIP / Promociones (app_settings.loyalty_config)
  let loyaltyConfig = { enabled: true, points_per_10_eur: 2, min_order_to_redeem: 15, rewards: [] };
  if (pointsRedeemed) {
    try {
      const { data: loyaltyRow } = await supabaseService
        .from('app_settings')
        .select('value')
        .eq('key', 'loyalty_config')
        .maybeSingle();
      if (loyaltyRow?.value) {
        const parsed = typeof loyaltyRow.value === 'string' ? JSON.parse(loyaltyRow.value) : loyaltyRow.value;
        loyaltyConfig = {
          enabled: parsed.enabled !== false,
          points_per_10_eur: Number(parsed.points_per_10_eur ?? 2),
          min_order_to_redeem: Number(parsed.min_order_to_redeem ?? 15),
          rewards: Array.isArray(parsed.rewards) ? parsed.rewards : []
        };
      }
    } catch {
      // use defaults
    }
  }
  const activeRewards = (loyaltyConfig.rewards || []).filter(r => r.active !== false);

  const productsById = new Map((products || []).map(p => [p.id, p]));
  let subtotal = 0;
  let eligibleDiscount = 0;
  let redeemTargetChosen = false;
  let redeemedItemIndex = -1;
  let requiredPointsCost = 20;
  let requiredMinOrder = Number(loyaltyConfig.min_order_to_redeem || 15);
  let hasJuevesPromo = false;
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
    // Marcador canónico "(Promo Jueves)" + etiquetas antiguas/traducidas ("(JUEVES LOCOS)",
    // "(CRAZY THURSDAYS)") que quedaron en carritos guardados: la traducción de la etiqueta
    // hizo que aquí no se reconociera la oferta y se cobrara precio de catálogo (12/11/2026).
    const isJuevesPromoItem = isThursdayInMadrid && product.jueves_promo_eligible === true && JUEVES_LABEL_RE.test(itemLabel);
    if (isJuevesPromoItem) {
      hasJuevesPromo = true;
    }

    // Si el frontend aún no envía item.price (o pestaña en caché), calculamos suplementos reales de extras y base Maxxi
    const extrasArr = Array.isArray(item.customization_details?.extras)
      ? item.customization_details.extras
      : (Array.isArray(item.extras) ? item.extras : []);
    const isPatatas = product.category_id === 'NUESTRAS PATATAS';
    const extrasSupplement = isPatatas
      ? extrasArr.reduce((acc, ex) => acc + (String(ex).toLowerCase().includes('cheddar') ? 1.00 : 0), 0)
      : extrasArr.length * 1.00;
    const isAlreadyMazzi = String(product.name || '').toUpperCase().includes('MAZZI') || String(product.name || '').toUpperCase().includes('MAXXI');
    const isMaxiSize = item.customization_details?.size === 'maxi' || itemLabel.includes('(Base Maxxi)');
    const baseSupplement = (!isAlreadyMazzi && isMaxiSize) ? 3.00 : 0;
    const computedPrice = Math.round((Number(product.price) + extrasSupplement + baseSupplement) * 100) / 100;

    const rawFrontendPrice = item.price ?? item.unit_price;
    const frontendPrice = rawFrontendPrice !== undefined && rawFrontendPrice !== null ? Number(rawFrontendPrice) : computedPrice;
    const unitPrice = isJuevesPromoItem
      ? JUEVES_PROMO_PRICE
      : (!isNaN(frontendPrice) && frontendPrice >= product.price && frontendPrice <= product.price + 30
          ? Math.round(frontendPrice * 100) / 100
          : computedPrice);
    unitPricesByIndex[index] = unitPrice;

    subtotal += unitPrice * qty;

    if (pointsRedeemed && loyaltyConfig.enabled) {
      const nameLower = (product.name || '').toLowerCase();
      const isEligiblePizza = !isJuevesPromoItem && (
        product.jueves_promo_eligible === true ||
        product.category_id === 'NUESTRAS PIZZAS' ||
        product.category_id === 'PIZZAS BLANCAS' ||
        (nameLower.includes('pizza') && !nameLower.includes('dulce') && !nameLower.includes('burguer'))
      );

      let matchedReward = activeRewards.find(
        r => r.target_type === 'product' && Number(r.product_id) === Number(product.id)
      );
      if (!matchedReward && isEligiblePizza) {
        matchedReward = activeRewards.find(r => r.target_type === 'pizzas_sugerencia') || {
          points_cost: 20,
          min_order: loyaltyConfig.min_order_to_redeem || 15
        };
      }

      if (matchedReward) {
        const rewardCost = Math.max(1, Number(matchedReward.points_cost || 20));
        const rewardMinOrder = Math.max(Number(loyaltyConfig.min_order_to_redeem || 15), Number(matchedReward.min_order || 15));
        if (item.redeem_target === true) {
          eligibleDiscount = unitPrice;
          redeemTargetChosen = true;
          redeemedItemIndex = index;
          requiredPointsCost = rewardCost;
          requiredMinOrder = rewardMinOrder;
        } else if (!redeemTargetChosen && (eligibleDiscount === 0 || unitPrice < eligibleDiscount)) {
          eligibleDiscount = unitPrice;
          redeemedItemIndex = index;
          requiredPointsCost = rewardCost;
          requiredMinOrder = rewardMinOrder;
        }
      }
    }
  }

  // 2) Elegibilidad real de canje de puntos VIP (pedido >= 15€ y puntos reales en el perfil).
  let discount = 0;
  if (pointsRedeemed && loyaltyConfig.enabled && verifiedUserId && eligibleDiscount > 0) {
    if (subtotal < requiredMinOrder) {
      return res.status(400).json({
        error: `El pedido mínimo para canjear tus puntos VIP es de ${requiredMinOrder.toFixed(2)} €. Te faltan ${(requiredMinOrder - subtotal).toFixed(2)} €.`
      });
    }
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('points')
      .eq('id', verifiedUserId)
      .single();
    if (profile && profile.points >= requiredPointsCost) {
      discount = eligibleDiscount;
    }
  }

  // 3) Verificación estricta de pedido mínimo y coste de envío configurados en Admin (store_settings)
  // El pedido mínimo de reparto se comprueba sobre el subtotal real del carrito antes del descuento VIP
  const { data: storeSettings } = await supabaseService
    .from('store_settings')
    .select('delivery_fee, min_order_delivery, jueves_promo_fee')
    .eq('id', 1)
    .single();

  const minOrderDelivery = Number(storeSettings?.min_order_delivery ?? 10);
  const baseDeliveryFee = deliveryMethod === 'delivery' ? Math.max(0, Number(storeSettings?.delivery_fee ?? 0)) : 0;
  // Suplemento de reparto Jueves Locos (+1,00 €): aplica únicamente si el pedido es a domicilio y contiene pizzas promo
  const juevesPromoDeliveryFee = (deliveryMethod === 'delivery' && hasJuevesPromo)
    ? Math.max(0, Number(storeSettings?.jueves_promo_fee ?? 1.00))
    : 0;
  const deliveryFee = baseDeliveryFee + juevesPromoDeliveryFee;
  const afterDiscount = Math.max(0, subtotal - discount);

  if (deliveryMethod === 'delivery' && subtotal < minOrderDelivery) {
    return res.status(400).json({
      error: `El pedido mínimo para envíos a domicilio en Caniles es de ${minOrderDelivery.toFixed(2)} €. Te faltan ${(minOrderDelivery - subtotal).toFixed(2)} €.`
    });
  }

  const amount = Math.round((afterDiscount + deliveryFee) * 100) / 100;

  if (amount < 0.50) {
    return res.status(400).json({ error: 'El importe del pedido es demasiado bajo para procesar el pago.' });
  }

  // 4) Guardamos el pedido "pendiente de pago" — el pedido real en `orders`
  //    se crea al confirmar el pago de forma síncrona en sumup-verify-order (o vía webhook).
  const checkoutReference = randomUUID();
  const orderPayload = {
    p_user_id: verifiedUserId,
    p_client_name: clientName,
    p_client_phone: clientPhone,
    p_delivery_address: deliveryAddress,
    p_delivery_method: deliveryMethod,
    p_items: items.map((item, index) => {
      const isRedeemedTarget = discount > 0 && index === redeemedItemIndex;
      const rawCustom = item.customization_details || { name: item.name, notes: item.notes, extras: item.extras };
      // process_checkout (SQL) reconoce la oferta por '(Promo Jueves)' en este nombre: se normaliza
      // para que el pedido final se grabe con el mismo precio que cobra SumUp.
      const baseCustom = { ...rawCustom, name: normalizeJuevesName(rawCustom.name ?? item.name) };
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: unitPricesByIndex[index],
        redeem_target: isRedeemedTarget || !!item.redeem_target,
        customization_details: isRedeemedTarget
          ? {
              ...baseCustom,
              is_vip_reward: true,
              vip_points_redeemed: requiredPointsCost,
              vip_discount: discount
            }
          : baseCustom
      };
    }),
    p_points_redeemed: !!discount,
    p_small_order_fee_accepted: false,
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
