import { createClient } from '@supabase/supabase-js';

// Endpoint para que Néstor solicite formalmente campañas de difusión oficial por WhatsApp
// a través de la Meta Cloud API y el MCP de Meta, supervisadas por DKitchen.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { campaignType, targetAudience, preferredSchedule, messageIdea, clientName } = req.body || {};

  if (!campaignType || !messageIdea) {
    return res.status(400).json({ error: 'Faltan datos obligatorios de la solicitud.' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const newRequest = {
      id: `camp-${Date.now()}`,
      campaign_type: campaignType,
      target_audience: targetAudience || 'todos',
      preferred_schedule: preferredSchedule || 'horario_noche',
      message_idea: messageIdea,
      requested_by: clientName || 'Néstor Pizzas Gerencia',
      status: 'pending_review',
      created_at: new Date().toISOString()
    };

    // 1. Guardar la solicitud en app_settings
    const { data: existingSettings } = await supabaseService
      .from('app_settings')
      .select('value')
      .eq('key', 'whatsapp_campaign_requests')
      .maybeSingle();

    let requestsList = [];
    if (existingSettings?.value) {
      try {
        requestsList = JSON.parse(existingSettings.value);
        if (!Array.isArray(requestsList)) requestsList = [];
      } catch {
        requestsList = [];
      }
    }

    requestsList.unshift(newRequest);

    await supabaseService
      .from('app_settings')
      .upsert({
        key: 'whatsapp_campaign_requests',
        value: JSON.stringify(requestsList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    // 2. Notificación interna (opcional por email transaccional)
    try {
      const origin = `https://${req.headers.host}`;
      fetch(`${origin}/api/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_admin',
          orderId: `SOLICITUD-WHATSAPP-${newRequest.id}`,
          clientName: `Néstor Pizzas - Campaña ${campaignType}`,
          total: 0
        })
      }).catch(() => {});
    } catch {}

    return res.status(200).json({
      ok: true,
      message: 'Solicitud de campaña de WhatsApp registrada con éxito.',
      request: newRequest
    });
  } catch (err) {
    console.error('Error registrando solicitud de campaña WhatsApp:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
