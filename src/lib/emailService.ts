/**
 * Envío de correos transaccionales vía /api/send-transactional-email
 * (SMTP real sobre el buzón tupizza@nestorpizzas.es — ver api/send-transactional-email.js).
 * Todas las funciones son "fire and forget": un fallo de email nunca debe
 * bloquear el checkout ni el registro del cliente.
 */

const send = async (payload: Record<string, any>) => {
  try {
    await fetch('/api/send-transactional-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error enviando email transaccional:', error);
  }
};

export const emailService = {
  /**
   * Envía confirmación de pedido al cliente
   */
  sendOrderConfirmation: (clientEmail: string, orderDetails: any) => {
    send({
      type: 'order_confirmation',
      to: clientEmail,
      orderId: orderDetails?.id,
      total: orderDetails?.total,
      clientName: orderDetails?.clientName
    });
  },

  /**
   * Envía notificación de nuevo pedido al administrador
   */
  sendOrderToAdmin: (orderDetails: any) => {
    send({
      type: 'order_admin',
      orderId: orderDetails?.id,
      total: orderDetails?.total,
      clientName: orderDetails?.clientName
    });
  },

  /**
   * Envía correo de bienvenida al nuevo usuario registrado
   */
  sendWelcomeEmail: (clientEmail: string, clientName: string) => {
    send({
      type: 'welcome',
      to: clientEmail,
      clientName
    });
  }
};
