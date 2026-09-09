import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const buildEmailHtml = ({ headline, message, flyerUrl, ctaText, ctaUrl }) => `
<div style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#0f172a;padding:28px 24px;text-align:center;border-bottom:4px solid #16a34a;">
        <div style="font-size:20px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">NÉSTOR PIZZAS</div>
        <div style="font-size:11px;color:#4ade80;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Masa Fresca Artesana &bull; Caniles (Granada)</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        ${headline ? `<h2 style="margin:0 0 16px 0;font-size:22px;font-weight:900;text-transform:uppercase;color:#0f172a;text-align:center;">${headline}</h2>` : ''}
        ${flyerUrl ? `<img src="${flyerUrl}" alt="Promoción" style="width:100%;border-radius:12px;margin-bottom:16px;display:block;" />` : ''}
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:20px;color:#334155;font-size:15px;line-height:1.6;white-space:pre-line;">${message}</div>
        <div style="text-align:center;margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:900;text-transform:uppercase;letter-spacing:1px;font-size:13px;padding:14px 32px;border-radius:10px;text-decoration:none;">${ctaText}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f1f5f9;padding:20px 24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
        <div style="font-weight:700;color:#334155;">NÉSTOR PIZZAS</div>
        <div>Calle Alcalde Felip, 9 &bull; 18810 Caniles (Granada) &bull; Tel: +34 679 76 19 87</div>
        <div style="margin-top:8px;color:#94a3b8;">Has recibido este correo porque formas parte del Club VIP de Néstor Pizzas.</div>
      </td>
    </tr>
  </table>
</div>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

  const { subject, headline, message, flyerUrl, ctaText, ctaUrl, recipients } = req.body || {};

  if (!subject || !message || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Faltan datos de la campaña (asunto, mensaje o destinatarios)' });
  }

  const validRecipients = recipients.filter(r => typeof r === 'string' && r.includes('@')).slice(0, 2000);
  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'No hay destinatarios con email válido' });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: 'El correo saliente no está configurado en el servidor todavía.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"Néstor Pizzas" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      bcc: validRecipients,
      subject,
      html: buildEmailHtml({ headline, message, flyerUrl, ctaText, ctaUrl })
    });

    return res.status(200).json({ success: true, sent: validRecipients.length });
  } catch (err) {
    console.error('Error enviando campaña:', err);
    return res.status(500).json({ error: 'No se pudo enviar la campaña. Inténtalo de nuevo.' });
  }
}
