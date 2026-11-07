import { createClient } from '@supabase/supabase-js';

// Endpoint consolidado para administración de clientes (actualización y eliminación)
// Cumple con la cuota de Serverless Functions de Vercel Hobby (máx. 12 funciones).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { action, id, fullName, phone, address, points, source, isApp, isKiosk } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'ID de cliente requerido.' });
  }

  const authHeader = req.headers.authorization || '';
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!callerToken) {
    return res.status(401).json({ error: 'Sesión de administrador requerida.' });
  }

  const supabaseUser = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${callerToken}` } } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: adminProfile } = await supabaseService
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.is_admin !== true) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador.' });
  }

  // 1. ACCIÓN: ELIMINAR CLIENTE
  if (action === 'delete') {
    try {
      let deletedFromProfiles = false;
      let deletedFromKiosk = false;

      // Eliminar de kiosk_customers si corresponde
      if (isKiosk || phone) {
        const { error: errId } = await supabaseService
          .from('kiosk_customers')
          .delete()
          .eq('id', id);

        if (!errId) deletedFromKiosk = true;

        if (phone && phone !== 'Sin Teléfono' && !phone.includes('00000')) {
          await supabaseService
            .from('kiosk_customers')
            .delete()
            .eq('phone', phone);
        }
      }

      // Eliminar de profiles y auth.users si corresponde
      if (isApp || !deletedFromKiosk) {
        await supabaseService
          .from('orders')
          .update({ user_id: null })
          .eq('user_id', id);

        const { error: profErr } = await supabaseService
          .from('profiles')
          .delete()
          .eq('id', id);

        if (!profErr) deletedFromProfiles = true;

        try {
          await supabaseService.auth.admin.deleteUser(id);
        } catch {
          // Ya no existe en auth o es solo de mostrador
        }
      }

      return res.status(200).json({
        success: true,
        ok: true,
        message: 'Ficha de cliente eliminada correctamente.',
        details: { deletedFromProfiles, deletedFromKiosk }
      });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      return res.status(500).json({ error: error.message || 'Error interno al eliminar el cliente.' });
    }
  }

  // 2. ACCIÓN: ACTUALIZAR CLIENTE (por defecto o action === 'update')
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Nombre es obligatorio para actualizar.' });
  }

  const cleanName = fullName.trim();
  const cleanPhone = (phone || '').trim();
  const cleanPoints = typeof points === 'number' && points >= 0 ? Math.floor(points) : (parseInt(points, 10) || 0);

  try {
    let updatedProfiles = false;
    let updatedKiosk = false;

    // Actualizar profiles si es usuario app
    if (isApp || source === 'app' || source === 'unified') {
      const updateData = {
        full_name: cleanName,
        phone: cleanPhone || null,
        address: address || null
      };

      if (!isNaN(cleanPoints)) {
        updateData.points = cleanPoints;
      }

      const { error: profileErr } = await supabaseService
        .from('profiles')
        .update(updateData)
        .eq('id', id);

      if (!profileErr) updatedProfiles = true;
    }

    // Actualizar kiosk_customers si es usuario de mostrador
    if (isKiosk || source === 'kiosk' || source === 'unified') {
      let query = supabaseService.from('kiosk_customers').update({
        full_name: cleanName,
        phone: cleanPhone || 'Sin Teléfono',
        address: address || null
      });

      if (isKiosk && !isApp) {
        query = query.eq('id', id);
      } else if (cleanPhone) {
        query = query.eq('phone', cleanPhone);
      }

      const { error: kioskErr } = await query;
      if (!kioskErr) updatedKiosk = true;
    }

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Cliente actualizado correctamente.',
      updated: { profiles: updatedProfiles, kiosk: updatedKiosk }
    });
  } catch (err) {
    console.error('Error interno actualizando cliente:', err);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar cliente.' });
  }
}
