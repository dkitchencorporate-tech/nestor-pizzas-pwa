// ==============================================================================
// BRIDGE-SERVER LOCAL ESC/POS - NESTOR PIZZAS (CANILES, GRANADA)
// Servidor relay HTTP -> Socket TCP Impresora Térmica TP8002
// ==============================================================================

const http = require('http');
const net = require('net');

const PORT = 8080;
const DEFAULT_PRINTER_IP = '192.168.1.200';
const DEFAULT_PRINTER_PORT = 9100;

function formatDualFiscalTicket(order) {
  const cleanId = (order.id ? order.id.toString().replace(/^#+/, '') : '00000000').slice(0, 8).toUpperCase();
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const dateStr = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const isPaid = order.payment_status === 'PAID' || order.payment_method === 'online' || order.payment_method === 'sumup_online' || order.payment_method === 'sumup';
  const isTpv = order.payment_method === 'tpv' || order.payment_method === 'physical' || order.payment_method === 'card_delivery';
  
  let payBanner = '*** COBRAR EN EFECTIVO ***';
  if (isPaid) {
    payBanner = '*** PAGADO ONLINE (TARJETA - NO COBRAR) ***';
  } else if (isTpv) {
    payBanner = '*** COBRAR CON DATAFONO ***';
  }

  const isDelivery = order.delivery_method === 'delivery';
  const isPickup = order.delivery_method === 'pickup';
  const serviceLabel = isDelivery ? 'A DOMICILIO' : (isPickup ? 'RECOGIDA EN LOCAL' : 'SALA / MESA');

  const clientName = (order.client_name || 'Mostrador').toUpperCase();
  const clientPhone = order.client_phone || '';

  const totalAmount = typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || 0);
  const baseImponible = (totalAmount / 1.10).toFixed(2);
  const cuotaIva = (totalAmount - parseFloat(baseImponible)).toFixed(2);

  const copies = ['[COPIA TIENDA / CAJA]', '[COPIA CLIENTE]'];
  let output = '';

  copies.forEach((copiaHeader, idx) => {
    output += `==========================================\n`;
    output += `              NESTOR PIZZAS               \n`;
    output += `          Nestor Rodriguez Moreno         \n`;
    output += `               CIF: 14635417B             \n`;
    output += `          Calle Alcalde Felipe, 9         \n`;
    output += `          18810 Caniles (Granada)         \n`;
    output += `      Tel: 679 761 987 - @nestorpizzas    \n`;
    output += `==========================================\n`;
    output += `          ${copiaHeader}                  \n`;
    output += `FACTURA: #NP-${cleanId}                   \n`;
    output += `SERVICIO: ${serviceLabel}                 \n`;
    output += `ESTADO DE PAGO: ${payBanner}              \n`;
    output += `FECHA: ${dateStr} - ${timeStr}            \n`;
    output += `ATENDIDO POR: CAJA                        \n`;
    output += `CLIENTE/MESA: ${clientName}               \n`;
    if (clientPhone) {
      output += `TEL: ${clientPhone}                     \n`;
    }
    if (isDelivery && order.delivery_address) {
      output += `DIRECCION: ${order.delivery_address}    \n`;
    }
    output += `------------------------------------------\n`;
    output += `CANT  DESCRIPCION                    TOTAL\n`;
    output += `------------------------------------------\n`;

    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item) => {
        const qty = item.quantity || 1;
        const price = item.unit_price || 0;
        const lineTotal = (qty * price).toFixed(2);
        const name = (item.customization_details?.name || item.products?.name || 'Producto').toUpperCase();
        
        const lineText = `${qty}x ${name}`.padEnd(30).slice(0, 30);
        output += `${lineText} ${lineTotal.padStart(7)} EUR\n`;

        if (item.customization_details?.extras && Array.isArray(item.customization_details.extras)) {
          item.customization_details.extras.forEach(extra => {
            const exName = typeof extra === 'string' ? extra : extra.name;
            output += `   * + ${exName}\n`;
          });
        }
        if (item.customization_details?.notes) {
          output += `   * ${item.customization_details.notes}\n`;
        }
      });
    }

    if (order.notes) {
      output += `------------------------------------------\n`;
      output += `NOTAS: ${order.notes}\n`;
    }

    output += `==========================================\n`;
    output += `TOTAL A PAGAR:               ${totalAmount.toFixed(2)} EUR\n`;
    output += `PAGO: ${payBanner}\n`;
    output += `------------------------------------------\n`;
    output += `Desglose Fiscal (IVA 10% Incluido):\n`;
    output += `  Base Imponible:            ${baseImponible} EUR\n`;
    output += `  Cuota IVA 10%:             ${cuotaIva} EUR\n`;
    output += `  Total Factura:             ${totalAmount.toFixed(2)} EUR\n`;
    output += `==========================================\n`;
    output += `     GRACIAS POR SU VISITA Y CONFIANZA!   \n`;
    output += `   Conserve este ticket como justificante \n`;
    output += `==========================================\n\n\n\n\n`;

    if (idx < copies.length - 1) {
      output += `\x1D\x56\x41\x10`; // Corte de papel entre copias
    }
  });

  return output;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const printerIp = data.printer_ip || DEFAULT_PRINTER_IP;
        const printerPort = data.printer_port || DEFAULT_PRINTER_PORT;

        let rawText = '';
        if (data.order) {
          rawText = formatDualFiscalTicket(data.order);
        } else if (data.text) {
          rawText = data.text;
        }

        const client = new net.Socket();
        client.setTimeout(4000);

        client.connect(printerPort, printerIp, () => {
          client.write(Buffer.from([0x1B, 0x40])); // Init ESC/POS
          client.write(rawText);
          client.write(Buffer.from([0x1D, 0x56, 0x41, 0x10])); // Cortar papel
          client.end();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', sent: true }));
        });

        client.on('error', (err) => {
          console.error('Error enviando a la impresora:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });

        client.on('timeout', () => {
          client.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Timeout de impresora LAN' }));
        });

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[NESTOR PIZZAS] Bridge Server escuchando en http://localhost:${PORT}`);
});
