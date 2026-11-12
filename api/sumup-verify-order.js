import { createClient } from '@supabase/supabase-js';

// Verificación síncrona activa de pago con SumUp y creación atómica de pedido.
// Invocado directamente por la PWA en /pago-verificando nada más regresar de SumUp.
// Elimina la dependencia exclusiva de webhooks externos y confirma el pedido en ~500ms.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { checkoutReference, sweepPending } = req.body || {};

  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Modo barrido automático (invocado por el TPV Admin cada 15s):
  // Verifica cualquier checkout pendiente reciente cuyos clientes hayan bloqueado el móvil
  // tras pagar en SumUp sin pulsar "Volver al sitio web del comerciante".
  if (sweepPending === true) {
    try {
      const cutoff = new Date(Date.now() - 90 * 60 * 1000).toISOString();
      const { data: pendings } = await supabaseService
        .from('sumup_checkouts')
        .select('checkout_reference, sumup_checkout_id')
        .eq('status', 'pending')
        .not('sumup_checkout_id', 'is', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!pendings || pendings.length === 0) {
        return res.status(200).json({ ok: true, swept: 0, recovered: [] });
      }

      const recovered = [];
      const origin = `https://${req.headers.host}`;

      for (const item of pendings) {
        try {
          const sRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${item.sumup_checkout_id}`, {
            headers: { Authorization: `Bearer ${process.env.SUMUP_SECRET_KEY}` }
          });
          if (!sRes.ok) continue;
          const sData = await sRes.json();

          if (sData.status === 'FAILED' || sData.status === 'EXPIRED') {
            await supabaseAnon.rpc('sumup_mark_checkout_failed', {
              p_sumup_checkout_id: item.sumup_checkout_id,
              p_status: sData.status === 'FAILED' ? 'failed' : 'expired'
            });
            continue;
          }

          if (sData.status !== 'PAID') continue;

          const { data: claimed } = await supabaseAnon.rpc('sumup_claim_checkout_for_processing', {
            p_sumup_checkout_id: item.sumup_checkout_id
          });
          if (!claimed || claimed.length === 0) continue;

          const { order_payload: orderPayload, amount: checkoutAmount, client_email: clientEmail } = claimed[0];
          let orderId = null;
          let success = false;
          try {
            const { data: createdOrderId, error: rpcError } = await supabaseService.rpc('process_checkout', orderPayload);
            if (rpcError) throw rpcError;
            orderId = createdOrderId;
            success = true;
            await supabaseService.from('orders').update({ payment_status: 'PAID', total_amount: checkoutAmount }).eq('id', orderId);
          } catch (e) {
            console.error('Error creando pedido en sweepPending:', e);
          }

          await supabaseAnon.rpc('sumup_finalize_checkout', {
            p_sumup_checkout_id: item.sumup_checkout_id,
            p_order_id: orderId,
            p_success: success
          });

          if (success && orderId) {
            recovered.push(orderId);
            const emailPayload = { orderId, total: checkoutAmount, clientName: orderPayload.p_client_name };
            const sendEmail = (body) => fetch(`${origin}/api/send-transactional-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            }).catch(() => {});
            const sends = [sendEmail({ type: 'order_admin', ...emailPayload })];
            if (clientEmail) sends.push(sendEmail({ type: 'order_confirmation', to: clientEmail, ...emailPayload }));
            await Promise.allSettled(sends);
          }
        } catch (innerErr) {
          console.error('Error en iteración sweepPending:', innerErr);
        }
      }

      return res.status(200).json({ ok: true, swept: pendings.length, recovered });
    } catch (sweepErr) {
      console.error('Error en sweepPending:', sweepErr);
      return res.status(500).json({ error: 'Error barriendo pagos pendientes.' });
    }
  }

  if (!checkoutReference || typeof checkoutReference !== 'string') {
    return res.status(400).json({ error: 'Referencia de checkout inválida.' });
  }

  try {
    // 1) Buscar el checkout en sumup_checkouts
    const { data: checkout, error: checkoutError } = await supabaseService
      .from('sumup_checkouts')
      .select('*')
      .eq('checkout_reference', checkoutReference)
      .single();

    if (checkoutError || !checkout) {
      console.warn('Checkout no encontrado para ref:', checkoutReference);
      return res.status(404).json({ error: 'Referencia de pago no encontrada.' });
    }

    // 2) Si ya está pagado y tiene orden, devolver éxito inmediatamente
    if (checkout.status === 'paid' && checkout.order_id) {
      return res.status(200).json({
        ok: true,
        status: 'paid',
        orderId: checkout.order_id,
        amount: checkout.amount,
        clientName: checkout.order_payload?.p_client_name,
        deliveryMethod: checkout.order_payload?.p_delivery_method || 'delivery',
        deliveryAddress: checkout.order_payload?.p_delivery_address || '',
        items: checkout.order_payload?.p_items || []
      });
    }

    // 3) Si ya está fallido o expirado
    if (checkout.status === 'failed' || checkout.status === 'expired') {
      return res.status(200).json({
        ok: false,
        status: checkout.status
      });
    }

    if (!checkout.sumup_checkout_id) {
      return res.status(400).json({ error: 'El checkout no tiene ID de SumUp asociado.' });
    }

    // 4) Consultar en vivo a la API oficial de SumUp
    let sumupRes;
    try {
      sumupRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkout.sumup_checkout_id}`, {
        headers: {
          Authorization: `Bearer ${process.env.SUMUP_SECRET_KEY}`
        }
      });
    } catch (netErr) {
      console.error('Error de red al consultar SumUp:', netErr);
      return res.status(502).json({ error: 'No se pudo contactar con la pasarela de pago SumUp.' });
    }

    if (!sumupRes.ok) {
      const errText = await sumupRes.text();
      console.error('SumUp devolvió error:', sumupRes.status, errText);
      return res.status(502).json({ error: 'Error devuelto por la pasarela de pago.' });
    }

    const sumupData = await sumupRes.json();

    // 5) Casos según el estado real en SumUp:
    if (sumupData.status === 'FAILED' || sumupData.status === 'EXPIRED') {
      await supabaseAnon.rpc('sumup_mark_checkout_failed', {
        p_sumup_checkout_id: checkout.sumup_checkout_id,
        p_status: sumupData.status === 'FAILED' ? 'failed' : 'expired'
      });
      return res.status(200).json({ ok: false, status: sumupData.status.toLowerCase() });
    }

    if (sumupData.status !== 'PAID') {
      // Sigue pendiente en la pasarela
      return res.status(200).json({ ok: true, status: 'pending' });
    }

    // 6) Estado PAID confirmado por SumUp: Reclamar atómicamente
    const { data: claimed, error: claimError } = await supabaseAnon.rpc('sumup_claim_checkout_for_processing', {
      p_sumup_checkout_id: checkout.sumup_checkout_id
    });

    if (claimError) {
      console.error('Error reclamando checkout:', claimError);
      return res.status(500).json({ error: 'Error interno de reclamación.' });
    }

    // Si no devuelve fila, otro proceso (ej. webhook o solicitud simultánea) ya lo reclamó o finalizó
    if (!claimed || claimed.length === 0) {
      const { data: freshCheckout } = await supabaseService
        .from('sumup_checkouts')
        .select('*')
        .eq('id', checkout.id)
        .single();

      if (freshCheckout?.status === 'paid' && freshCheckout.order_id) {
        return res.status(200).json({
          ok: true,
          status: 'paid',
          orderId: freshCheckout.order_id,
          amount: freshCheckout.amount,
          clientName: freshCheckout.order_payload?.p_client_name,
          deliveryMethod: freshCheckout.order_payload?.p_delivery_method || 'delivery',
          deliveryAddress: freshCheckout.order_payload?.p_delivery_address || '',
          items: freshCheckout.order_payload?.p_items || []
        });
      }

      return res.status(200).json({ ok: true, status: 'processing' });
    }

    // 7) Procesar el pedido con process_checkout en Supabase
    const { order_payload: orderPayload, amount: checkoutAmount, client_email: clientEmail } = claimed[0];
    let orderId = null;
    let success = false;

    try {
      const { data: createdOrderId, error: rpcError } = await supabaseService.rpc('process_checkout', orderPayload);
      if (rpcError) throw rpcError;
      orderId = createdOrderId;
      success = true;

      // Asegurar que payment_status quede explícitamente como 'PAID' en orders
      await supabaseService.from('orders').update({ payment_status: 'PAID', total_amount: checkoutAmount }).eq('id', orderId);
    } catch (orderErr) {
      console.error('process_checkout falló en sumup-verify-order:', checkout.sumup_checkout_id, orderErr);
    }

    // 8) Finalizar checkout
    await supabaseAnon.rpc('sumup_finalize_checkout', {
      p_sumup_checkout_id: checkout.sumup_checkout_id,
      p_order_id: orderId,
      p_success: success
    });

    if (!success || !orderId) {
      return res.status(500).json({ error: 'No se pudo registrar el pedido en el sistema.' });
    }

    // 9) Enviar confirmaciones por email en segundo plano seguro
    const origin = `https://${req.headers.host}`;
    const emailPayload = { orderId, total: checkoutAmount, clientName: orderPayload.p_client_name };
    const sendEmail = (body) => fetch(`${origin}/api/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(err => console.error('Error enviando email post-pago:', err));

    const emailSends = [sendEmail({ type: 'order_admin', ...emailPayload })];
    if (clientEmail) {
      emailSends.push(sendEmail({ type: 'order_confirmation', to: clientEmail, ...emailPayload }));
    }
    await Promise.allSettled(emailSends);

    return res.status(200).json({
      ok: true,
      status: 'paid',
      orderId,
      amount: checkoutAmount,
      clientName: orderPayload.p_client_name,
      deliveryMethod: orderPayload.p_delivery_method || 'delivery',
      deliveryAddress: orderPayload.p_delivery_address || '',
      items: orderPayload.p_items || []
    });
  } catch (globalErr) {
    console.error('Error no controlado en sumup-verify-order:', globalErr);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
