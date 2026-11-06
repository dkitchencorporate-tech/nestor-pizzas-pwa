import { createClient } from '@supabase/supabase-js';

// Endpoint para que el administrador actualice los datos de cualquier cliente
// (tanto usuarios registrados de la App en `profiles` como fichas de mostrador en `kiosk_customers`).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id, fullName, phone, address, points, source, isApp, isKiosk } = req.body || {};

  if (!id || !fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'ID y Nombre son obligatorios.' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cleanName = fullName.trim();
  const cleanPhone = (phone || '').trim();
  const cleanPoints = typeof points === 'number' && points >= 0 ? Math.floor(points) : (parseInt(points, 10) || 0);

  try {
    let updatedProfiles = false;
    let updatedKiosk = false;

    // 1. Si es cliente de la App (o unificado), actualizar tabla `profiles`
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

      if (profileErr) {
        console.warn('Error actualizando profiles para id:', id, profileErr.message);
      } else {
        updatedProfiles = true;
      }
    }

    // 2. Si es cliente de mostrador (o unificado), actualizar tabla `kiosk_customers`
    if (isKiosk || source === 'kiosk' || source === 'unified') {
      // Buscar por ID o por teléfono si es unificado
      let query = supabaseService.from('kiosk_customers').update({
        full_name: cleanName,
        phone: cleanPhone || 'Sin Teléfono',
        address: address || null
      });

      if (isKiosk && !isApp) {
        query = query.eq('id', id);
      } else if (cleanPhone) {
        // En unificado buscamos por teléfono en kiosk_customers
        query = query.eq('phone', cleanPhone);
      }

      const { error: kioskErr } = await query;
      if (kioskErr) {
        console.warn('Error actualizando kiosk_customers:', kioskErr.message);
      } else {
        updatedKiosk = true;
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Cliente actualizado correctamente.',
      updated: { profiles: updatedProfiles, kiosk: updatedKiosk }
    });
  } catch (err) {
    console.error('Error interno actualizando cliente:', err);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar cliente.' });
  }
}
