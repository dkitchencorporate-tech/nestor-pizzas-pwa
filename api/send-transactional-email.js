import nodemailer from 'nodemailer';

const wrap = (title, bodyHtml) => `
<div style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#0f172a;padding:24px;text-align:center;border-bottom:4px solid #16a34a;">
        <div style="font-size:18px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">NÉSTOR PIZZAS GOURMET</div>
        <div style="font-size:11px;color:#4ade80;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${title}</div>
      </td>
    </tr>
    <tr><td style="padding:28px 24px;color:#334155;font-size:14px;line-height:1.6;">${bodyHtml}</td></tr>
    <tr>
      <td style="background:#f1f5f9;padding:16px 24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
        Calle Alcalde Felip, 9 &bull; 18810 Caniles (Granada) &bull; +34 679 76 19 87
      </td>
    </tr>
  </table>
</div>
`;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const templates = {
  order_confirmation: (d) => ({
    subject: `Pedido confirmado ${d.orderId ? '#' + String(d.orderId).slice(0, 8).toUpperCase() : ''} — Néstor Pizzas`,
    to: d.to,
    html: wrap('Pedido confirmado', `
      <p>Hola ${escapeHtml(d.clientName) || ''},</p>
      <p>Hemos recibido tu pedido correctamente. En breve empezaremos a prepararlo.</p>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:14px;margin:16px 0;">
        <p style="margin:0;"><strong>Total:</strong> ${Number(d.total || 0).toFixed(2)}€</p>
      </div>
      <p>Puedes seguir el estado de tu pedido desde la app.</p>
    `)
  }),
  order_admin: (d) => ({
    subject: `🔔 Nuevo pedido ${d.orderId ? '#' + String(d.orderId).slice(0, 8).toUpperCase() : ''} — ${Number(d.total || 0).toFixed(2)}€`,
    to: process.env.SMTP_USER,
    html: wrap('Nuevo pedido recibido', `
      <p><strong>Cliente:</strong> ${escapeHtml(d.clientName) || 'Cliente anónimo'}</p>
      <p><strong>Total:</strong> ${Number(d.total || 0).toFixed(2)}€</p>
      <p>Revisa el panel de Pedidos para ver el detalle completo.</p>
    `)
  }),
  welcome: (d) => ({
    subject: '¡Bienvenido al Club VIP de Néstor Pizzas!',
    to: d.to,
    html: wrap('¡Bienvenido!', `
      <p>Hola ${escapeHtml(d.clientName) || ''},</p>
      <p>Gracias por registrarte en Néstor Pizzas. A partir de ahora acumulas puntos VIP con cada pedido, canjeables por descuentos.</p>
      <p>¡Que aproveche!</p>
    `)
  })
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { type, to } = req.body || {};
  if (!templates[type]) {
    return res.status(400).json({ error: 'Tipo de correo desconocido' });
  }

  if (type !== 'order_admin' && (!to || !to.includes('@'))) {
    return res.status(400).json({ error: 'Falta un email de destino válido' });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // No-op silencioso: nunca debe romper el flujo de compra/registro del cliente
    return res.status(200).json({ skipped: true });
  }

  try {
    const built = templates[type](req.body || {});
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"Néstor Pizzas" <${process.env.SMTP_USER}>`,
      to: built.to,
      subject: built.subject,
      html: built.html
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error enviando email transaccional:', err);
    // No-op: un fallo de email nunca debe bloquear el checkout/registro en el frontend
    return res.status(200).json({ success: false });
  }
}
