// Servicio de Impresión Multi-Terminal (PC Principal + Tablets/Móviles en Red Wi-Fi)
// Convierte un JSON de Ticket en un payload ESC/POS y lo envía al Proxy Local del TPV (Caniles)
import { getOrderVipRedemptionInfo } from '../store/loyaltyStore';

export const STORAGE_KEY = 'nestor_printer_proxy_url';
export const CONFIG_STORAGE_KEY = 'nestor_printer_config';
export const DEFAULT_MAIN_PC_IP = '192.168.1.16';
export const DEFAULT_KITCHEN_PRINTER_IP = '192.168.1.101';

export interface ProxyHealthResponse {
  version: string;
  service: string;
  status: string;
  cached_orders?: number;
  uptime?: string;
}

/**
 * Detecta si el navegador actual corre en una Tablet (incluyendo iPadOS en modo escritorio) o Móvil
 */
export const isMobileOrTabletDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod|Android|Mobile|Tablet/i.test(ua) || isTouchMac;
};

/**
 * Normaliza cualquier URL del proxy eliminando barras finales o el sufijo '/print'
 */
export const normalizeProxyBaseUrl = (rawUrl: string): string => {
  let clean = (rawUrl || '').trim();
  if (!clean) return '';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  clean = clean.replace(/\/+$/, '');
  if (clean.toLowerCase().endsWith('/print')) {
    clean = clean.slice(0, -6).replace(/\/+$/, '');
  }
  return clean;
};

/**
 * 1. Obtiene la URL base del servidor proxy configurada en este dispositivo
 *    Ej: 'http://localhost:8080' (PC Caja) o 'http://192.168.1.16:8080' (Tablet / Terminal 2)
 */
export const getPrinterProxyUrl = (): string => {
  try {
    const savedProxy = localStorage.getItem(STORAGE_KEY);
    if (savedProxy && savedProxy.trim().length > 0) {
      return normalizeProxyBaseUrl(savedProxy);
    }

    const legacyRaw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.relayUrl && typeof parsed.relayUrl === 'string') {
        const normalized = normalizeProxyBaseUrl(parsed.relayUrl);
        // Si estamos en una tablet/móvil y había quedado 'localhost' por defecto sin configurar,
        // redirigir automáticamente a la IP fija del PC de Caja (192.168.1.16)
        if (isMobileOrTabletDevice() && normalized.includes('localhost')) {
          return `http://${DEFAULT_MAIN_PC_IP}:8080`;
        }
        if (normalized) return normalized;
      }
    }
  } catch {
    // Fallback seguro si localStorage está restringido
  }

  return isMobileOrTabletDevice()
    ? `http://${DEFAULT_MAIN_PC_IP}:8080`
    : 'http://localhost:8080';
};

/**
 * 2. Guarda la URL configurada para este dispositivo en ambas claves de localStorage
 *    para mantener compatibilidad total con todo el sistema TPV
 */
export const savePrinterProxyUrl = (
  url: string,
  options?: { printerIp?: string; printerPort?: string; useDirectPrint?: boolean }
): void => {
  const cleanBase = normalizeProxyBaseUrl(url) || (isMobileOrTabletDevice() ? `http://${DEFAULT_MAIN_PC_IP}:8080` : 'http://localhost:8080');
  localStorage.setItem(STORAGE_KEY, cleanBase);

  let existing: any = {};
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {
    existing = {};
  }

  const nextConfig = {
    ip: options?.printerIp || existing.ip || DEFAULT_KITCHEN_PRINTER_IP,
    port: options?.printerPort || existing.port || '9100',
    useDirectPrint: options?.useDirectPrint !== undefined ? options.useDirectPrint : true,
    relayUrl: `${cleanBase}/print`,
  };

  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
};

/**
 * 3. Valida la salud y conectividad con un servidor proxy específico (GET /)
 */
export const testProxyHealth = async (
  baseUrl: string,
  timeoutMs: number = 1500
): Promise<{ ok: boolean; data?: ProxyHealthResponse; error?: string }> => {
  const cleanUrl = normalizeProxyBaseUrl(baseUrl);
  if (!cleanUrl) {
    return { ok: false, error: 'Dirección de servidor vacía' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cleanUrl}/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data: ProxyHealthResponse = await res.json();
    const isNestorProxy =
      data?.service?.includes('Nestor Pizzas') ||
      data?.status === 'online' ||
      Boolean(data?.version);

    if (isNestorProxy) {
      return { ok: true, data };
    }
    return { ok: false, error: 'El servicio respondió pero no es el proxy de Néstor Pizzas.' };
  } catch (err: any) {
    clearTimeout(timer);
    const msg =
      err?.name === 'AbortError'
        ? 'Tiempo de espera agotado (Timeout)'
        : err?.message || 'Error de red';
    return { ok: false, error: msg };
  }
};

/**
 * 4. Escáner Automático: Localiza el PC de Caja en la red Wi-Fi sin configuración manual
 */
export const autoDiscoverPrinterServer = async (
  onProgress?: (message: string) => void
): Promise<string | null> => {
  // A. Candidatos prioritarios (muy alta probabilidad en Caniles)
  const priorityCandidates = isMobileOrTabletDevice()
    ? [
        `http://${DEFAULT_MAIN_PC_IP}:8080`, // IP fija del PC de Caja en Caniles
        'http://192.168.1.100:8080',
        'http://192.168.1.15:8080',
        'http://192.168.1.17:8080',
        'http://192.168.1.20:8080',
        'http://localhost:8080',
      ]
    : [
        'http://localhost:8080', // PC principal
        `http://${DEFAULT_MAIN_PC_IP}:8080`,
        'http://192.168.1.100:8080',
        'http://192.168.1.15:8080',
        'http://192.168.1.17:8080',
        'http://192.168.1.20:8080',
      ];

  if (onProgress) onProgress(`Comprobando servidor principal (${DEFAULT_MAIN_PC_IP})...`);

  const priorityChecks = priorityCandidates.map(async (url) => {
    const res = await testProxyHealth(url, 1200);
    return res.ok ? url : null;
  });

  const priorityResults = await Promise.all(priorityChecks);
  const foundPriority = priorityResults.find((url) => url !== null);
  if (foundPriority) {
    return foundPriority;
  }

  // B. Escaneo profundo de la subred local (192.168.1.2 hasta 192.168.1.40)
  if (onProgress) onProgress('Buscando servidor de impresión en la red Wi-Fi...');
  const subnetIps: string[] = [];
  for (let i = 2; i <= 40; i++) {
    const candidate = `http://192.168.1.${i}:8080`;
    if (!priorityCandidates.includes(candidate)) {
      subnetIps.push(candidate);
    }
  }

  const BATCH_SIZE = 8;
  for (let i = 0; i < subnetIps.length; i += BATCH_SIZE) {
    const batch = subnetIps.slice(i, i + BATCH_SIZE);
    if (onProgress) onProgress(`Escaneando IPs (${batch[0]} - ${batch[batch.length - 1]})...`);

    const batchPromises = batch.map(async (url) => {
      const res = await testProxyHealth(url, 700);
      return res.ok ? url : null;
    });

    const batchResults = await Promise.all(batchPromises);
    const discovered = batchResults.find((url) => url !== null);
    if (discovered) {
      return discovered;
    }
  }

  return null;
};

/**
 * 5. Envío directo de un payload de impresión al Proxy (con fallback automático a 192.168.1.16 en tablets)
 */
export const printOrderPayload = async (
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const proxyBase = getPrinterProxyUrl();

  const trySend = async (baseUrl: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`${baseUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Error en servidor de impresión (HTTP ${response.status})`);
      }

      const data = await response.json().catch(() => ({}));
      return { success: true, data };
    } catch (e: any) {
      clearTimeout(timer);
      throw e;
    }
  };

  try {
    return await trySend(proxyBase);
  } catch (err: any) {
    // Si estamos en tablet/móvil y por error tenía localhost, reintentar automáticamente contra 192.168.1.16:8080
    const fallbackUrl = `http://${DEFAULT_MAIN_PC_IP}:8080`;
    if (proxyBase !== fallbackUrl) {
      try {
        const retryResult = await trySend(fallbackUrl);
        if (retryResult.success) {
          savePrinterProxyUrl(fallbackUrl);
          return retryResult;
        }
      } catch {
        // continuar al retorno de error
      }
    }

    return {
      success: false,
      error: `No se pudo conectar con el proxy (${proxyBase}/print). Verifica que el PC de caja esté encendido y conectado al Wi-Fi. Detalle: ${err?.message || 'Error de red'}`,
    };
  }
};

/**
 * 6. Función principal invocada al aceptar o imprimir un pedido desde AdminOrders o AdminKiosk
 */
export const sendToNetworkPrinter = async (order: any): Promise<boolean> => {
  try {
    const configRaw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const savedProxyUrl = localStorage.getItem(STORAGE_KEY);
    let config: any = {};

    if (configRaw) {
      try {
        config = JSON.parse(configRaw);
      } catch {
        config = {};
      }
    }

    // Si el usuario desactivó explícitamente el modo directo Y no configuró URL de proxy, usar impresión navegador
    if (config.useDirectPrint === false && !savedProxyUrl) {
      return false;
    }

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
    const orderCleanId = (order.id ? order.id.toString().replace(/^#+/, '') : '00000000').slice(0, 8).toUpperCase();
    text += `FECHA: ${dateStr} - ${timeStr}
`;
    text += `TICKET: #NP-${orderCleanId}
`;
    text += `--------------------------------
`;

    const rawAddr = typeof order.delivery_address === 'string' ? order.delivery_address : '';
    const isMesa = order.delivery_method === 'local' || order.delivery_method === 'dine_in';
    const isPickup = !isMesa && (order.delivery_method === 'pickup' || rawAddr.toLowerCase().includes('recogida'));
    const isDelivery = !isMesa && !isPickup;

    // Clasificación explícita de pago
    const pMethod = order.payment_method || 'cash';
    const isPaid = order.payment_status === 'PAID' || pMethod === 'online' || pMethod === 'sumup_online' || pMethod === 'sumup';
    const isTpv = pMethod === 'tpv' || pMethod === 'card_delivery';

    let payBanner = '*** COBRAR EN EFECTIVO ***';
    if (isPaid) {
      payBanner = '*** PAGADO ONLINE (NO COBRAR) ***';
    } else if (isTpv) {
      payBanner = '*** COBRAR CON DATAFONO ***';
    }

    if (isMesa) {
      text += `SERVICIO: SALA / MESA
`;
      text += `TIPO:   *** SALA / MESA ***
`;
      text += `MESA:   ${(order.client_name || 'MESA LOCAL').toUpperCase()}
`;
    } else if (isDelivery) {
      text += `SERVICIO: A DOMICILIO
`;
      text += `TIPO:   *** A DOMICILIO ***
`;
    } else {
      text += `SERVICIO: RECOGIDA EN LOCAL
`;
      text += `TIPO:   *** RECOGIDA EN LOCAL ***
`;
    }

    text += `PAGO:   ${payBanner}
`;

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
      } catch {
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

    const vipInfo = getOrderVipRedemptionInfo(order);

    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item: any) => {
        const qty = item.quantity || 1;
        const price = item.unit_price || 0;
        const lineTotal = (qty * price).toFixed(2);
        let itemName = item.customization_details?.name || item.products?.name || 'Producto';
        const isRedeemedItem =
          vipInfo.hasVipRedemption &&
          (item?.customization_details?.is_vip_reward === true ||
            (vipInfo.redeemedItemId !== null && item.id === vipInfo.redeemedItemId));

        if (item.is_new) {
          itemName += ' [NUEVO]';
        } else if (item.is_old) {
          itemName += ' (YA PEDIDO)';
        }

        text += `${qty}x    ${itemName.padEnd(16).slice(0, 16)} ${lineTotal.padStart(6)}E
`;
        if (isRedeemedItem) {
          text += `  * [CANJE VIP ${vipInfo.pointsRedeemed} PTOS: -${Number(vipInfo.discountApplied).toFixed(2)} EUR]
`;
        }

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
    const totalNum = Number(order.total_amount || 0);
    if (vipInfo.hasVipRedemption) {
      const subtotalNum = totalNum + Number(vipInfo.discountApplied || 0);
      text += `SUBTOTAL:             ${subtotalNum.toFixed(2)} EUR
`;
      text += `CANJE VIP (${vipInfo.pointsRedeemed} PTOS):  -${Number(vipInfo.discountApplied).toFixed(2)} EUR
`;
      text += `PROD. VIP: ${vipInfo.redeemedProductName}
`;
    }
    const totalFinal = totalNum.toFixed(2);
    text += `TOTAL A PAGAR:        ${totalFinal} EUR
`;
    text += `--------------------------------
`;
    text += `ESTADO DE PAGO:
`;
    text += `>> ${payBanner} <<
`;

    text += `================================
`;
    text += `   GRACIAS POR SU CONFIANZA
`;
    text += `



`;

    const serviceLabel = isMesa ? 'SALA / MESA' : isPickup ? 'RECOGIDA EN LOCAL' : 'A DOMICILIO';
    const enrichedItems = Array.isArray(order.order_items)
      ? order.order_items.map((item: any) => {
          const isRedeemedItem =
            vipInfo.hasVipRedemption &&
            (item?.customization_details?.is_vip_reward === true ||
              (vipInfo.redeemedItemId !== null && item.id === vipInfo.redeemedItemId));
          if (!isRedeemedItem) return item;
          const prevExtras = Array.isArray(item.customization_details?.extras) ? item.customization_details.extras : [];
          const vipTag = `CANJE PUNTOS VIP (${vipInfo.pointsRedeemed} PTOS): -${Number(vipInfo.discountApplied).toFixed(2)} EUR`;
          const hasTag = prevExtras.some((e: any) => (typeof e === 'string' ? e : e?.name || '').includes('CANJE PUNTOS VIP'));
          return {
            ...item,
            is_vip_reward: true,
            customization_details: {
              ...(item.customization_details || {}),
              is_vip_reward: true,
              vip_points_redeemed: vipInfo.pointsRedeemed,
              vip_discount: vipInfo.discountApplied,
              extras: hasTag ? prevExtras : [vipTag, ...prevExtras],
            },
          };
        })
      : [];

    const normalizedOrder = {
      ...order,
      order_items: enrichedItems,
      delivery_method: isMesa ? 'dine_in' : isPickup ? 'pickup' : 'delivery',
      delivery_address: isDelivery ? order.delivery_address : '',
      servicio: serviceLabel,
      zona: serviceLabel,
      payment_method: isPaid ? 'online' : isTpv ? 'tpv' : 'cash',
      payment_status: isPaid ? 'PAID' : order.payment_status || 'PENDING',
      vip_redeemed: vipInfo.hasVipRedemption,
      points_redeemed: vipInfo.pointsRedeemed,
      discount_applied: vipInfo.discountApplied,
      subtotal_amount: Number((totalNum + Number(vipInfo.discountApplied || 0)).toFixed(2)),
      vip_product_name: vipInfo.redeemedProductName,
    };

    const payload = {
      printer_ip: config.ip || DEFAULT_KITCHEN_PRINTER_IP,
      printer_port: parseInt(config.port, 10) || 9100,
      text,
      order: normalizedOrder,
    };

    const result = await printOrderPayload(payload);
    return result.success;
  } catch (error) {
    console.error('Error comunicando con el proxy de impresión en red:', error);
    return false;
  }
};
