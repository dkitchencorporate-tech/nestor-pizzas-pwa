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

  const body = req.body || {};
  const {
    min_order_delivery,
    delivery_fee,
    allow_delivery,
    delivery_allow_card,
    delivery_allow_cash,
    allow_pickup,
    pickup_allow_card,
    pickup_allow_cash
  } = body;

  // 1) Actualizar store_settings (numéricos)
  const storeUpdates = {};
  if (typeof min_order_delivery === 'number' && min_order_delivery >= 0) {
    storeUpdates.min_order_delivery = Math.round(min_order_delivery * 100) / 100;
  }
  if (typeof delivery_fee === 'number' && delivery_fee >= 0) {
    storeUpdates.delivery_fee = Math.round(delivery_fee * 100) / 100;
  }

  let updatedStoreSettings = null;
  if (Object.keys(storeUpdates).length > 0) {
    const { data, error } = await supabaseService
      .from('store_settings')
      .update(storeUpdates)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando store_settings:', error);
      return res.status(500).json({ error: 'Error al actualizar importes en store_settings' });
    }
    updatedStoreSettings = data;
  }

  // 2) Actualizar políticas en app_settings (pares clave-valor)
  const policyKeys = [
    { key: 'allow_delivery', val: allow_delivery },
    { key: 'delivery_allow_card', val: delivery_allow_card },
    { key: 'delivery_allow_cash', val: delivery_allow_cash },
    { key: 'allow_pickup', val: allow_pickup },
    { key: 'pickup_allow_card', val: pickup_allow_card },
    { key: 'pickup_allow_cash', val: pickup_allow_cash }
  ];

  const appSettingsRows = [];
  for (const item of policyKeys) {
    if (typeof item.val === 'boolean') {
      appSettingsRows.push({
        key: item.key,
        value: item.val ? 'true' : 'false',
        updated_at: new Date().toISOString()
      });
    }
  }

  if (appSettingsRows.length > 0) {
    const { error: appErr } = await supabaseService
      .from('app_settings')
      .upsert(appSettingsRows, { onConflict: 'key' });

    if (appErr) {
      console.error('Error actualizando app_settings:', appErr);
      return res.status(500).json({ error: 'Error al actualizar políticas en app_settings' });
    }
  }

  return res.status(200).json({
    ok: true,
    storeSettings: updatedStoreSettings,
    policiesUpdated: appSettingsRows.length
  });
}
