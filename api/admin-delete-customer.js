import { createClient } from '@supabase/supabase-js';

// Endpoint para que el administrador elimine la ficha de cualquier cliente
// (tanto usuarios registrados de la App en `profiles`/`auth.users` como fichas de mostrador en `kiosk_customers`).
// Los pedidos históricos se conservan por motivos fiscales y contables desacoplando el user_id.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id, phone, isApp, isKiosk } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'ID de cliente requerido para la eliminación.' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    let deletedFromProfiles = false;
    let deletedFromKiosk = false;

    // 1. Eliminar de kiosk_customers si corresponde
    if (isKiosk || phone) {
      // Intentar borrar por ID
      const { error: errId } = await supabaseService
        .from('kiosk_customers')
        .delete()
        .eq('id', id);

      if (!errId) deletedFromKiosk = true;

      // Si tiene teléfono válido, asegurar borrado por teléfono
      if (phone && phone !== 'Sin Teléfono' && !phone.includes('00000')) {
        await supabaseService
          .from('kiosk_customers')
          .delete()
          .eq('phone', phone);
      }
    }

    // 2. Eliminar de profiles y auth.users si corresponde
    if (isApp || !deletedFromKiosk) {
      // Desvincular pedidos históricos a nivel fiscal (para no romper claves foráneas)
      await supabaseService
        .from('orders')
        .update({ user_id: null })
        .eq('user_id', id);

      // Eliminar fila de profiles
      const { error: profErr } = await supabaseService
        .from('profiles')
        .delete()
        .eq('id', id);

      if (!profErr) {
        deletedFromProfiles = true;
      }

      // Eliminar usuario de autenticación de Supabase Auth
      try {
        await supabaseService.auth.admin.deleteUser(id);
      } catch (authErr) {
        console.warn('Usuario auth no encontrado o ya eliminado:', id);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Ficha de cliente eliminada correctamente.',
      details: { deletedFromProfiles, deletedFromKiosk }
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return res.status(500).json({ error: error.message || 'Error interno al eliminar el cliente.' });
  }
}
