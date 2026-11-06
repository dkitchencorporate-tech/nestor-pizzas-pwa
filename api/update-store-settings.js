import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Sesión requerida' });
  }

  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile } = await supabaseService
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_admin) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  const { min_order_delivery, delivery_fee } = req.body || {};

  const updates = {};
  if (typeof min_order_delivery === 'number' && min_order_delivery >= 0) {
    updates.min_order_delivery = Math.round(min_order_delivery * 100) / 100;
  }
  if (typeof delivery_fee === 'number' && delivery_fee >= 0) {
    updates.delivery_fee = Math.round(delivery_fee * 100) / 100;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
  }

  const { data, error } = await supabaseService
    .from('store_settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando store_settings:', error);
    return res.status(500).json({ error: 'Error al guardar los ajustes' });
  }

  return res.status(200).json({ ok: true, settings: data });
}
