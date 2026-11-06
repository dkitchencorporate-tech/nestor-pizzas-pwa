import { createClient } from '@supabase/supabase-js';

// Endpoint para unificar automáticamente clientes históricos de Iavanza (kiosk_customers)
// cuando se registran en la PWA, heredando su dirección y asignando el bono de bienvenida de 4 puntos VIP.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId, phone, fullName } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Falta el ID del usuario.' });
  }

  const supabaseService = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '').trim() : '';

    let legacyCustomer = null;
    if (cleanPhone && cleanPhone.length >= 6) {
      const { data } = await supabaseService
        .from('kiosk_customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      legacyCustomer = data;
    }

    // 1. Obtener perfil actual para no sobrescribir datos existentes más recientes
    const { data: currentProfile } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const updates = {
      // 4 puntos de bienvenida acordados para incentivar el primer pedido
      points: Math.max(4, currentProfile?.points || 0)
    };

    if (cleanPhone && (!currentProfile?.phone || currentProfile.phone !== cleanPhone)) {
      updates.phone = cleanPhone;
    }

    if (legacyCustomer) {
      // Heredar dirección si el usuario no tiene ninguna guardada todavía
      if (!currentProfile?.address && legacyCustomer.address) {
        updates.address = legacyCustomer.address;
      }
      // Heredar nombre si el usuario no lo especificó
      if (!currentProfile?.full_name && !fullName && legacyCustomer.full_name) {
        updates.full_name = legacyCustomer.full_name;
      }
    }

    const { error: updateError } = await supabaseService
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Error actualizando perfil unificado:', updateError);
      return res.status(500).json({ error: 'No se pudo vincular el perfil.' });
    }

    return res.status(200).json({
      ok: true,
      matched: !!legacyCustomer,
      welcomePoints: 4,
      inheritedAddress: !!(legacyCustomer && updates.address)
    });
  } catch (err) {
    console.error('Error en link-legacy-customer:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
