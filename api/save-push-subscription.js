import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { phone, subscription } = req.body || {};
  if (!phone || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Datos de suscripción incompletos' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

  const { error } = await supabase.from('push_subscriptions').insert({
    client_phone: phone,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth
  });

  // 23505 = ya existía esa suscripción (mismo endpoint) — no es un error real
  if (error && error.code !== '23505') {
    console.error('Error guardando suscripción push:', error);
    return res.status(500).json({ error: 'No se pudo guardar la suscripción' });
  }

  return res.status(200).json({ success: true });
}
