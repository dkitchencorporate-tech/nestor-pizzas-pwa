// Servicio de Impresión Independiente a través de un Proxy Node.js Local
// Convierte un JSON de Ticket en un payload ESC/POS (Texto Plano formateado)

export const sendToNetworkPrinter = async (order: any): Promise<boolean> => {
  try {
    const configRaw = localStorage.getItem('nestor_printer_config');
    if (!configRaw) return false;
    
    const config = JSON.parse(configRaw);
    if (!config.useDirectPrint) return false;

    // Generar formato de texto tipo ESC/POS
    let text = `================================\n`;
    text += `       NESTOR PIZZAS\n`;
    text += `================================\n\n`;
    text += `TICKET: ${order.id.slice(0, 8).toUpperCase()}\n`;
    text += `TIPO: ${order.delivery_method === 'delivery' ? 'A DOMICILIO' : 'RECOGIDA'}\n`;
    text += `CLIENTE: ${order.client_name || 'Sin Nombre'}\n`;
    text += `TELEFONO: ${order.client_phone || ''}\n`;
    
    if (order.delivery_method === 'delivery' && order.delivery_address) {
      let addr = order.delivery_address;
      try {
        if (typeof addr === 'string') addr = JSON.parse(addr);
        text += `DIRECCION: ${addr.street} ${addr.door || ''}\n`;
      } catch(e) {
        text += `DIRECCION: ${addr}\n`;
      }
    }
    
    text += `\n--------------------------------\n`;
    text += `CANT   ARTICULO            TOTAL\n`;
    text += `--------------------------------\n`;
    
    order.order_items?.forEach((item: any) => {
      const lineTotal = (item.quantity * item.unit_price).toFixed(2);
      text += `${item.quantity}x     ${item.products?.name.substring(0, 18).padEnd(18, ' ')} ${lineTotal}EUR\n`;
      if (item.options) {
        Object.entries(item.options).forEach(([k, v]) => {
          text += `  * ${v}\n`;
        });
      }
    });
    
    text += `--------------------------------\n`;
    if (order.discount_applied > 0) {
      text += `DESCUENTO VIP:        -${order.discount_applied.toFixed(2)} EUR\n`;
    }
    text += `TOTAL A PAGAR:         ${order.total_amount.toFixed(2)} EUR\n`;
    text += `================================\n`;
    text += `      GRACIAS POR SU VISITA\n`;
    text += `\n\n\n\n\n\n`; // Espacio para el corte térmico

    const payload = {
      printer_ip: config.ip,
      printer_port: parseInt(config.port) || 9100,
      text: text
    };

    const res = await fetch(config.relayUrl || 'http://localhost:8080/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (error) {
    console.error("Error comunicando con el proxy de impresión en red:", error);
    return false;
  }
};
