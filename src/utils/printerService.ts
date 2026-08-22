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
    
    if (order.estimated_ready_at) {
      const date = new Date(order.estimated_ready_at);
      const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      text += `LISTO A LAS: ${timeStr}\n`;
    }

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
      const itemName = item.customization_details?.name || item.products?.name || 'Producto';
      
      text += `${item.quantity}x     ${itemName}\n`;
      text += `                    ${lineTotal}EUR\n`;
      
      if (item.customization_details?.extras && Array.isArray(item.customization_details.extras)) {
        item.customization_details.extras.forEach((extra: any) => {
          const extraName = typeof extra === 'string' ? extra : extra.name;
          text += `  * + ${extraName}\n`;
        });
      }
      if (item.customization_details?.notes) {
        text += `  * NOTA: ${item.customization_details.notes}\n`;
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
