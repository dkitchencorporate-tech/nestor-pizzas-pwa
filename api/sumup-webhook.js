import { createClient } from '@supabase/supabase-js';

// SumUp solo envía { event_type, id } — nunca el estado real. Su propia
// documentación exige no fiarse del payload y siempre reconfirmar llamando
// a su API. Este handler hace exactamente eso antes de tocar nada.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const { event_type, id: sumupCheckoutId } = req.body || {};

  // Eventos futuros que no conocemos: los reconocemos con 2xx y no hacemos nada,
  // tal como pide la documentación de SumUp.
  if (event_type !== 'CHECKOUT_STATUS_CHANGED' || !sumupCheckoutId) {
    return res.status(200).json({ ok: true });
  }

  // Anon key para las funciones SECURITY DEFINER de control (no necesitan más).
  const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

  // Reverificación real e independiente contra la API de SumUp — el único
  // dato en el que confiamos para decidir si un pedido se paga o no.
  let sumupRes;
  try {
    sumupRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${sumupCheckoutId}`, {
      headers: { Authorization: `Bearer ${process.env.SUMUP_SECRET_KEY}` }
    });
  } catch (err) {
    console.error('Error de red verificando checkout con SumUp:', err);
    // 500 → SumUp reintentará el webhook más tarde (1min/5min/20min/2h).
    return res.status(500).json({ error: 'No se pudo verificar con SumUp' });
  }

  if (!sumupRes.ok) {
    console.error('SumUp devolvió error al consultar el checkout:', sumupRes.status);
    return res.status(500).json({ error: 'Verificación fallida' });
  }

  const checkout = await sumupRes.json();

  if (checkout.status === 'FAILED' || checkout.status === 'EXPIRED') {
    await supabaseAnon.rpc('sumup_mark_checkout_failed', {
      p_sumup_checkout_id: sumupCheckoutId,
      p_status: checkout.status === 'FAILED' ? 'failed' : 'expired'
    });
    return res.status(200).json({ ok: true, status: checkout.status });
  }

  if (checkout.status !== 'PAID') {
    // Todavía pendiente — no hay nada que hacer aún.
    return res.status(200).json({ ok: true, status: checkout.status });
  }

  // Reclamación atómica: si otra entrega de este mismo webhook (reintento)
  // ya está procesando o ya procesó este pago, esta llamada no devuelve fila
  // y no se crea un segundo pedido.
  const { data: claimed, error: claimError } = await supabaseAnon.rpc('sumup_claim_checkout_for_processing', {
    p_sumup_checkout_id: sumupCheckoutId
  });

  if (claimError) {
    console.error('Error reclamando checkout:', claimError);
    return res.status(500).json({ error: 'Error interno' });
  }

  if (!claimed || claimed.length === 0) {
    // Ya reclamado por otra entrega del webhook, o referencia desconocida — ack y salir.
    return res.status(200).json({ ok: true, alreadyProcessed: true });
  }

  const { order_payload: orderPayload, amount: checkoutAmount, client_email: clientEmail } = claimed[0];

  // Cliente con la service_role key — SOLO se usa aquí, para esta única
  // llamada, después de haber confirmado el pago real con SumUp. Nunca se
  // expone al navegador. `process_checkout` reconoce este claim (`role =
  // service_role`, firmado por Supabase Auth, no falsificable por un
  // cliente) como llamada de confianza, igual que ya reconoce a un admin
  // autenticado para el flujo de Kiosko.
  const supabaseService = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let orderId = null;
  let success = false;
  try {
    const { data, error } = await supabaseService.rpc('process_checkout', orderPayload);
    if (error) throw error;
    orderId = data;
    success = true;
  } catch (err) {
    console.error('process_checkout falló tras pago confirmado:', sumupCheckoutId, err);
  }

  await supabaseAnon.rpc('sumup_finalize_checkout', {
    p_sumup_checkout_id: sumupCheckoutId,
    p_order_id: orderId,
    p_success: success
  });

  if (!success) {
    // 500 → que SumUp reintente el webhook; el checkout vuelve a 'pending'
    // así que el próximo intento podrá reclamarlo y reintentar sin duplicar nada.
    return res.status(500).json({ error: 'No se pudo crear el pedido' });
  }

  // Antes de este arreglo, un pedido pagado con tarjeta (todo lo que pasa
  // por este webhook) nunca disparaba ni la confirmación al cliente ni el
  // aviso de pedido nuevo al negocio — solo lo hacía el flujo de pago
  // físico/efectivo, resuelto directo en CheckoutModal.tsx. Se espera a que
  // termine el envío (en serverless, la función puede congelarse justo al
  // devolver la respuesta, así que un "fire and forget" real aquí se
  // perdería) pero un fallo de correo nunca debe convertirse en un 500 —
  // el pedido ya está creado y cobrado, eso es lo único que importa para el
  // código de estado que ve SumUp.
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

  return res.status(200).json({ ok: true, orderId });
}
