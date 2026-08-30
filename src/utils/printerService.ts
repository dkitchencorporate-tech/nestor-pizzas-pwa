// Servicio de Impresión Independiente a través de un Proxy Node.js Local
// Convierte un JSON de Ticket en un payload ESC/POS (Texto Plano formateado)

export const sendToNetworkPrinter = async (order: any): Promise<boolean> => {
  try {
    const configRaw = localStorage.getItem('nestor_printer_config');
    if (!configRaw) return false;
    
    const config = JSON.parse(configRaw);
    if (!config.useDirectPrint) return false;

    // Formateo de fecha y hora local
    const orderDate = order.created_at ? new Date(order.created_at) : new Date();
    const dateStr = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Generar formato de texto tipo ESC/POS de alta legibilidad
    let text = `================================
`;
    text += `       NESTOR PIZZAS
`;
    text += `   Masa Fresca & Gourmet
`;
    text += `================================
`;
    text += `FECHA: ${dateStr} - ${timeStr}
`;
    text += `TICKET: #NP-${order.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}
`;
    text += `--------------------------------
`;
    
    const isMesa = order.delivery_method === 'local';
    const isDelivery = order.delivery_method === 'delivery';
    const isPickup = order.delivery_method === 'pickup';
    
    if (isMesa) {
      text += `TIPO:   *** SALA / MESA ***
`;
      text += `MESA:   ${(order.client_name || 'MESA LOCAL').toUpperCase()}
`;
    } else if (isDelivery) {
      text += `TIPO:   *** A DOMICILIO ***
`;
    } else {
      text += `TIPO:   *** PARA RECOGER ***
`;
    }
    
    if (order.estimated_ready_at) {
      const readyDate = new Date(order.estimated_ready_at);
      const readyTime = readyDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      text += `HORA ESTIMADA: ${readyTime} H
`;
    }

    if (!isMesa) {
      text += `CLIENTE:  ${(order.client_name || 'Mostrador').toUpperCase()}
`;
      if (order.client_phone) {
        text += `TELEFONO: ${order.client_phone}
`;
      }
    }
    
    if (isDelivery && order.delivery_address) {
      let addr = order.delivery_address;
      try {
        if (typeof addr === 'string' && addr.startsWith('{')) addr = JSON.parse(addr);
        if (typeof addr === 'object') {
          let fullAddress = addr.street || '';
          if (addr.number) fullAddress += `, Nº ${addr.number}`;
          if (addr.door) fullAddress += `, ${addr.door}`;
          if (addr.cp) fullAddress += `, CP ${addr.cp}`;
          if (addr.notes) fullAddress += ` (Notas: ${addr.notes})`;
          text += `DIRECCION: ${fullAddress}
`;
        } else {
          text += `DIRECCION: ${addr}
`;
        }
      } catch(e) {
        text += `DIRECCION: ${addr}
`;
      }
    }
    
    text += `--------------------------------
`;
    text += `CANT   ARTICULO            TOTAL
`;
    text += `--------------------------------
`;
    
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item: any) => {
        const qty = item.quantity || 1;
        const price = item.unit_price || 0;
        const lineTotal = (qty * price).toFixed(2);
        let itemName = item.customization_details?.name || item.products?.name || 'Producto';
        
        if (item.is_new) {
          itemName += ' [NUEVO]';
        } else if (item.is_old) {
          itemName += ' (YA PEDIDO)';
        }
        
        text += `${qty}x    ${itemName.padEnd(16).slice(0, 16)} ${lineTotal.padStart(6)}E
`;
        
        if (item.customization_details?.extras && Array.isArray(item.customization_details.extras)) {
          item.customization_details.extras.forEach((extra: any) => {
            const extraName = typeof extra === 'string' ? extra : extra.name;
            text += `  * + ${extraName}
`;
          });
        }
        if (item.customization_details?.notes) {
          text += `  * NOTA: ${item.customization_details.notes}
`;
        }
      });
    }
    
    // Notas Especiales de Cocina / Reparto
    if (order.notes && typeof order.notes === 'string' && order.notes.trim()) {
      text += `--------------------------------
`;
      text += `NOTAS / INSTRUCCIONES:
`;
      text += `${order.notes.trim()}
`;
    }

    text += `--------------------------------
`;
    if (order.discount_applied > 0) {
      text += `DESCUENTO VIP:        -${order.discount_applied.toFixed(2)} EUR
`;
    }
    const totalFinal = typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : '0.00';
    text += `TOTAL:                 ${totalFinal} EUR
`;
    
    // Instrucción de pago explícita
    const pMethod = order.payment_method || 'cash';
    let payBanner = 'EFECTIVO (Cobrar)';
    if (pMethod === 'tpv' || pMethod === 'physical' || pMethod === 'card_delivery') {
      payBanner = 'DATAFONO TPV (Cobrar)';
    } else if (pMethod === 'online' || pMethod === 'sumup_online') {
      payBanner = 'PAGADO ONLINE (SumUp)';
    }
    text += `COBRO:                 ${payBanner}
`;
    
    text += `================================
`;
    text += `   GRACIAS POR SU CONFIANZA
`;
    text += `



`; // Espacio para el corte térmico

    const payload = {
      printer_ip: config.ip || '192.168.1.200',
      printer_port: parseInt(config.port, 10) || 9100,
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
