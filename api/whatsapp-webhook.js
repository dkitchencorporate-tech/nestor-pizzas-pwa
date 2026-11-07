import { createClient } from '@supabase/supabase-js';

// Webhook oficial de WhatsApp Cloud API para Néstor Pizzas
// Endpoint: https://nestorpizzas.es/api/whatsapp-webhook
export default async function handler(req, res) {
  // 1. Verificación del Webhook por parte de Meta (GET Challenge)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'nestor_pizzas_whatsapp_verify_token_2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Handshake verificado con éxito por Meta.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook] Fallo en la verificación del token.');
      return res.status(403).json({ error: 'Token de verificación no coincide.' });
    }
  }

  // 2. Recepción de eventos en tiempo real (POST)
  if (req.method === 'POST') {
    const body = req.body;

    // Reconocimiento inmediato HTTP 200 a Meta para evitar reintentos
    res.status(200).json({ status: 'received' });

    if (!body || body.object !== 'whatsapp_business_account') {
      return;
    }

    try {
      const supabaseService = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value) continue;

          // Eventos de estado de plantillas (message_template_status_update)
          if (change.field === 'message_template_status_update') {
            console.log('[WhatsApp Webhook] Actualización de plantilla:', value.event, value.message_template_name);
            await supabaseService
              .from('app_settings')
              .upsert({
                key: `template_status_${value.message_template_name}`,
                value: JSON.stringify(value),
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' })
              .catch(() => {});
          }

          // Mensajes entrantes de clientes
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              const from = msg.from; // Teléfono del cliente
              const text = msg.text?.body || msg.interactive?.button_reply?.title || '';
              console.log(`[WhatsApp Webhook] Mensaje recibido de ${from}: ${text}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Error procesando evento en segundo plano:', err);
    }

    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Método no permitido' });
}
