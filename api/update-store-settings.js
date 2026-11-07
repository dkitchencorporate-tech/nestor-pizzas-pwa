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
    pickup_allow_cash,
    loyalty_config
  } = body;

  // 0) Si viene loyalty_config (Promociones y Puntos VIP), sanitizar y guardar en app_settings
  if (loyalty_config && typeof loyalty_config === 'object') {
    const cleanLoyalty = {
      enabled: loyalty_config.enabled !== false,
      points_per_10_eur: Math.max(0, Math.min(100, Number(loyalty_config.points_per_10_eur ?? 2))),
      min_order_to_redeem: Math.max(0, Math.min(200, Math.round(Number(loyalty_config.min_order_to_redeem ?? 15) * 100) / 100)),
      rewards: Array.isArray(loyalty_config.rewards)
        ? loyalty_config.rewards.map((r, idx) => ({
            id: String(r.id || `reward-${idx + 1}`).slice(0, 64),
            title: String(r.title || 'Recompensa VIP').slice(0, 120),
            description: String(r.description || '').slice(0, 300),
            points_cost: Math.max(1, Math.min(500, Math.round(Number(r.points_cost || 20)))),
            min_order: Math.max(0, Math.min(200, Math.round(Number(r.min_order ?? loyalty_config.min_order_to_redeem ?? 15) * 100) / 100)),
            target_type: r.target_type === 'product' ? 'product' : 'pizzas_sugerencia',
            product_id: r.product_id ? Number(r.product_id) : null,
            product_name: String(r.product_name || 'Cualquier Pizza Sugerencia').slice(0, 120),
            active: r.active !== false
          }))
        : []
    };

    const { error: loyaltyErr } = await supabaseService
      .from('app_settings')
      .upsert(
        {
          key: 'loyalty_config',
          value: JSON.stringify(cleanLoyalty),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (loyaltyErr) {
      console.error('Error actualizando loyalty_config:', loyaltyErr);
      return res.status(500).json({ error: 'Error al guardar la configuración de puntos VIP' });
    }

    return res.status(200).json({ ok: true, config: cleanLoyalty });
  }

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

  // Sincronización en tiempo real para importes numéricos (espejo reactivo en app_settings)
  if (typeof min_order_delivery === 'number' && min_order_delivery >= 0) {
    appSettingsRows.push({
      key: 'min_order_delivery',
      value: String(Math.round(min_order_delivery * 100) / 100),
      updated_at: new Date().toISOString()
    });
  }
  if (typeof delivery_fee === 'number' && delivery_fee >= 0) {
    appSettingsRows.push({
      key: 'delivery_fee',
      value: String(Math.round(delivery_fee * 100) / 100),
      updated_at: new Date().toISOString()
    });
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
