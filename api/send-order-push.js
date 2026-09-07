import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// Construye y firma un JWT VAPID (RFC 8292) usando solo el módulo crypto de Node —
// sin la librería web-push, para no depender de un árbol de paquetes que no
// podemos parchear a mano de forma segura en package-lock.json.
function buildVapidAuthHeader(endpointOrigin) {
  const jwk = JSON.parse(process.env.VAPID_PRIVATE_JWK);
  const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });

  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({
    aud: endpointOrigin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || 'mailto:tupizza@nestorpizzas.es'
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const jwt = `${signingInput}.${b64url(signature)}`;

  return `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

async function sendPush(subscription) {
  const endpointOrigin = new URL(subscription.endpoint).origin;
  const authHeader = buildVapidAuthHeader(endpointOrigin);

  // Push "vacío" (sin payload cifrado): el service worker muestra un texto fijo.
  // Evita implementar a mano el cifrado aes128gcm (RFC 8291), que es mucho más
  // fácil de hacer mal de forma silenciosa que la firma VAPID.
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      TTL: '86400',
      'Content-Length': '0'
    }
  });

  return response;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const authHeaderIn = req.headers.authorization || '';
  const token = authHeaderIn.startsWith('Bearer ') ? authHeaderIn.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }

  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: 'Falta el teléfono del cliente' });
  }

  if (!process.env.VAPID_PRIVATE_JWK || !process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Las notificaciones push no están configuradas en el servidor.' });
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('client_phone', phone);

  if (subsError) {
    return res.status(500).json({ error: 'No se pudieron leer las suscripciones' });
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  let sent = 0;
  for (const sub of subs) {
    try {
      const result = await sendPush(sub);
      if (result.ok) {
        sent += 1;
      } else if (result.status === 404 || result.status === 410) {
        // La suscripción ya no existe en el navegador del cliente — la borramos
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    } catch (err) {
      console.error('Error enviando push a', sub.endpoint, err);
    }
  }

  return res.status(200).json({ sent });
}
