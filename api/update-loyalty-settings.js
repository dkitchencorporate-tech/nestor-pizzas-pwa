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
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  const config = req.body?.loyalty_config;
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Configuración de fidelización inválida' });
  }

  const sanitizedConfig = {
    enabled: config.enabled !== false,
    points_per_10_eur: Math.max(0, Math.min(100, Number(config.points_per_10_eur ?? 2))),
    min_order_to_redeem: Math.max(0, Number(config.min_order_to_redeem ?? 15)),
    rewards: Array.isArray(config.rewards)
      ? config.rewards.map((r, idx) => ({
          id: String(r.id || `reward-${idx + 1}`),
          title: String(r.title || 'Recompensa Club VIP').trim(),
          description: String(r.description || '').trim(),
          points_cost: Math.max(1, Math.round(Number(r.points_cost || 20))),
          min_order: Math.max(0, Number(r.min_order ?? config.min_order_to_redeem ?? 15)),
          target_type: r.target_type === 'product' ? 'product' : 'pizzas_sugerencia',
          product_id: r.target_type === 'product' && r.product_id ? Number(r.product_id) : null,
          product_name: r.product_name ? String(r.product_name) : null,
          active: r.active !== false
        }))
      : []
  };

  const { error: upsertErr } = await supabaseService
    .from('app_settings')
    .upsert({
      key: 'loyalty_config',
      value: JSON.stringify(sanitizedConfig),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (upsertErr) {
    console.error('Error guardando loyalty_config:', upsertErr);
    return res.status(500).json({ error: 'No se pudo guardar la configuración de puntos' });
  }

  return res.status(200).json({
    ok: true,
    loyalty_config: sanitizedConfig
  });
}
