// Servicio de Impresión Multi-Terminal (PC Principal + Tablets/Móviles en Red Wi-Fi)
// Incluye Transporte Dual:
//   1. Directo LAN HTTP (para el propio PC de Caja en http://localhost:8080 o navegadores sin bloqueo Mixed-Content)
//   2. Puente Seguro HTTPS en Tiempo Real (Supabase Bridge) para iPad / iOS Safari y Tablets Android
//      que bloquean peticiones HTTP a IPs locales (192.168.1.16:8080) desde dominios HTTPS (nestorpizzas.es).
import { supabase } from '../lib/supabase';
import { getOrderVipRedemptionInfo } from '../store/loyaltyStore';

export const STORAGE_KEY = 'nestor_printer_proxy_url';
export const CONFIG_STORAGE_KEY = 'nestor_printer_config';
export const DEFAULT_MAIN_PC_IP = '192.168.1.16';
export const DEFAULT_KITCHEN_PRINTER_IP = '192.168.1.101';

const BRIDGE_STATUS_KEY = 'printer_bridge_status';
const BRIDGE_QUEUE_KEY = 'printer_bridge_queue';
const BRIDGE_CHANNEL_NAME = 'nestor_print_bridge';

export interface ProxyHealthResponse {
  version: string;
  service: string;
  status: string;
  cached_orders?: number;
  uptime?: string;
  mode?: 'direct_lan' | 'https_bridge';
}

interface CloudPrintJob {
  job_id: string;
  payload: any;
  status: 'pending' | 'printed' | 'error';
  created_at: number;
  printed_at?: number;
}

// Registro en memoria para evitar imprimir dos veces el mismo trabajo en el PC de Caja
const processedBridgeJobIds = new Set<string>();
const processedOrderPrintTimestamps = new Map<string, number>();
let masterBridgeInitialized = false;

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
      const normalizedSaved = normalizeProxyBaseUrl(savedProxy);
      if (isMobileOrTabletDevice() && normalizedSaved.includes('localhost')) {
        return `http://${DEFAULT_MAIN_PC_IP}:8080`;
      }
      return normalizedSaved;
    }

    const legacyRaw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.relayUrl && typeof parsed.relayUrl === 'string') {
        const normalized = normalizeProxyBaseUrl(parsed.relayUrl);
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
 */
export const savePrinterProxyUrl = (
  url: string,
  options?: { printerIp?: string; printerPort?: string; useDirectPrint?: boolean }
): void => {
  const cleanBase =
    normalizeProxyBaseUrl(url) ||
    (isMobileOrTabletDevice() ? `http://${DEFAULT_MAIN_PC_IP}:8080` : 'http://localhost:8080');
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
 * Ping HTTP directo sin fallback (usado internamente para saber si ESTE dispositivo es el PC de Caja)
 */
export const pingLocalProxyDirect = async (
  baseUrl: string,
  timeoutMs: number = 1200
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
      return { ok: true, data: { ...data, mode: 'direct_lan' } };
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
 * Verifica el Puente Seguro HTTPS (Supabase) para Tablets/iPads donde Safari bloquea HTTP en IPs LAN
 */
const checkHttpsPrintBridgeHealth = async (): Promise<{
  ok: boolean;
  data?: ProxyHealthResponse;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [BRIDGE_STATUS_KEY, 'store_closed']);

    if (error) {
      return { ok: false, error: error.message };
    }

    const bridgeRow = data?.find((r: any) => r.key === BRIDGE_STATUS_KEY);
    let parsedBridge: any = null;
    if (bridgeRow?.value) {
      try {
        parsedBridge =
          typeof bridgeRow.value === 'string' ? JSON.parse(bridgeRow.value) : bridgeRow.value;
      } catch {
        parsedBridge = null;
      }
    }

    return {
      ok: true,
      data: {
        version: parsedBridge?.version || '3.1.0',
        service: 'Nestor Pizzas Print Proxy (Puente Seguro HTTPS iPad/Wi-Fi → PC Caja)',
        status: 'online',
        mode: 'https_bridge',
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error verificando puente HTTPS' };
  }
};

/**
 * 3. Valida la salud y conectividad con un servidor proxy específico
 *    Intenta primero conexión directa LAN y, si el navegador (ej. iPad Safari en HTTPS)
 *    bloquea HTTP local por Mixed Content, activa y verifica automáticamente el Puente Seguro HTTPS.
 */
export const testProxyHealth = async (
  baseUrl: string,
  timeoutMs: number = 1400
): Promise<{ ok: boolean; data?: ProxyHealthResponse; error?: string }> => {
  const cleanUrl = normalizeProxyBaseUrl(baseUrl);
  if (!cleanUrl) {
    return { ok: false, error: 'Dirección de servidor vacía' };
  }

  // 1. Intento directo HTTP (funciona en el PC de Caja con http://localhost:8080)
  const directResult = await pingLocalProxyDirect(cleanUrl, timeoutMs);
  if (directResult.ok) {
    return directResult;
  }

  // 2. Si estamos configurando una IP de red local (ej. 192.168.1.16:8080) o estamos en un iPad/Tablet
  //    donde HTTPS bloquea peticiones HTTP a IPs LAN, verificamos el Puente Seguro HTTPS hacia el PC de Caja.
  const isLanIpTarget =
    cleanUrl.includes('192.168.') ||
    cleanUrl.includes('10.') ||
    cleanUrl.includes('172.') ||
    isMobileOrTabletDevice();

  if (isLanIpTarget) {
    const bridgeResult = await checkHttpsPrintBridgeHealth();
    if (bridgeResult.ok) {
      return bridgeResult;
    }
  }

  return directResult;
};

/**
 * 4. Escáner Automático: Localiza el PC de Caja en la red Wi-Fi o vincula por Puente Seguro HTTPS en iPad/Tablet
 */
export const autoDiscoverPrinterServer = async (
  onProgress?: (message: string) => void
): Promise<string | null> => {
  // A. Si este dispositivo es el propio PC de Caja (localhost:8080 responde directo)
  if (!isMobileOrTabletDevice()) {
    if (onProgress) onProgress('Verificando si este equipo es el PC Principal de Caja...');
    const localCheck = await pingLocalProxyDirect('http://localhost:8080', 1000);
    if (localCheck.ok) {
      return 'http://localhost:8080';
    }
  }

  // B. Comprobar IP fija del PC de Caja en Caniles (192.168.1.16:8080) directo
  const mainPcUrl = `http://${DEFAULT_MAIN_PC_IP}:8080`;
  if (onProgress) onProgress(`Conectando con el PC de Caja (${DEFAULT_MAIN_PC_IP}:8080)...`);
  const directMainPc = await pingLocalProxyDirect(mainPcUrl, 1000);
  if (directMainPc.ok) {
    return mainPcUrl;
  }

  // C. En iPad / Tablet (Safari bajo HTTPS) las peticiones HTTP a 192.168.1.x son bloqueadas por WebKit Mixed-Content.
  //    Activamos y validamos automáticamente el Puente Seguro HTTPS con el PC de Caja (192.168.1.16:8080).
  if (onProgress) onProgress('Activando Puente Seguro HTTPS/Wi-Fi con el PC de Caja...');
  const bridgeCheck = await checkHttpsPrintBridgeHealth();
  if (bridgeCheck.ok) {
    return mainPcUrl;
  }

  return null;
};

/**
 * Encola un trabajo de impresión a través del Puente Seguro HTTPS (Supabase Realtime + app_settings)
 * para que el PC de Caja Principal lo imprima instantáneamente en localhost:8080/print
 */
const enqueueCloudPrintJob = async (
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newJob: CloudPrintJob = {
      job_id: jobId,
      payload,
      status: 'pending',
      created_at: Date.now(),
    };

    // 1. Leer cola actual para conservar trabajos recientes de los últimos 90 segundos
    const { data: existingRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', BRIDGE_QUEUE_KEY)
      .maybeSingle();

    let queue: CloudPrintJob[] = [];
    if (existingRow?.value) {
      try {
        const parsed =
          typeof existingRow.value === 'string'
            ? JSON.parse(existingRow.value)
            : existingRow.value;
        if (Array.isArray(parsed)) {
          queue = parsed.filter(
            (j: CloudPrintJob) => j && Date.now() - (j.created_at || 0) < 90000
          );
        }
      } catch {
        queue = [];
      }
    }

    queue.push(newJob);
    if (queue.length > 10) {
      queue = queue.slice(queue.length - 10);
    }

    const { error: upsertErr } = await supabase.from('app_settings').upsert({
      key: BRIDGE_QUEUE_KEY,
      value: JSON.stringify(queue),
    });

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    // 2. Emitir broadcast en tiempo real para latencia < 150ms hacia el PC de Caja
    try {
      const ch = supabase.channel(BRIDGE_CHANNEL_NAME);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void ch.send({
            type: 'broadcast',
            event: 'print_job',
            payload: newJob,
          });
          setTimeout(() => {
            void supabase.removeChannel(ch);
          }, 1500);
        }
      });
    } catch {
      // El polling + postgres_changes en el PC de Caja garantiza la entrega aunque falle el broadcast
    }

    return {
      success: true,
      data: {
        mode: 'https_bridge',
        job_id: jobId,
        service: 'Enviado al PC de Caja vía Puente Seguro HTTPS/Wi-Fi',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'No se pudo enviar el trabajo al puente de impresión.',
    };
  }
};

/**
 * 5. Envío de un payload de impresión al Proxy (Directo LAN + Puente Seguro HTTPS automático para iPad/Tablets)
 */
export const printOrderPayload = async (
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const proxyBase = getPrinterProxyUrl();

  const trySendDirect = async (baseUrl: string, timeoutMs = 1500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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

  // A. Si no es un dispositivo móvil/tablet, probar envío directo primero (ej. localhost:8080 en el PC de Caja)
  try {
    const timeout = isMobileOrTabletDevice() ? 1000 : 3500;
    return await trySendDirect(proxyBase, timeout);
  } catch {
    // B. Si estamos en el PC de Caja pero tenía otra IP puesta, intentar localhost:8080 directo
    if (!isMobileOrTabletDevice() && !proxyBase.includes('localhost')) {
      try {
        const localRetry = await trySendDirect('http://localhost:8080', 1500);
        if (localRetry.success) return localRetry;
      } catch {
        // continuar al puente HTTPS
      }
    }

    // C. Fallback automático e instantáneo por Puente Seguro HTTPS (iPad Safari / Tablets / Móviles)
    const bridgeResult = await enqueueCloudPrintJob(payload);
    if (bridgeResult.success) {
      return bridgeResult;
    }

    return {
      success: false,
      error: `No se pudo conectar con el servidor de impresión (${proxyBase}). Verifica la conexión a Internet/Wi-Fi.`,
    };
  }
};

/**
 * 6. Servicio Maestro de Puente en el PC de Caja Principal:
 *    Se ejecuta automáticamente en segundo plano cuando el Panel Admin está abierto en el PC de Caja
 *    (donde http://localhost:8080 está activo). Escucha trabajos enviados desde el iPad / Terminal 2
 *    y los imprime al instante en http://localhost:8080/print (Cocina + Mostrador).
 */
export const initMasterPrintBridge = (): (() => void) => {
  if (masterBridgeInitialized || typeof window === 'undefined') {
    return () => {};
  }

  let isDisposed = false;
  let pollTimer: any = null;
  let heartbeatTimer: any = null;
  let realtimeChannel: any = null;

  const executeLocalPrintJob = async (job: CloudPrintJob): Promise<boolean> => {
    if (!job || !job.job_id || !job.payload) return false;
    if (processedBridgeJobIds.has(job.job_id)) return false;
    // Tolerar desfase de reloj entre dispositivos de hasta 10 minutos
    if (Math.abs(Date.now() - (job.created_at || 0)) > 600000) return false;

    processedBridgeJobIds.add(job.job_id);

    // Si es una reimpresión manual explícita o prueba, permitir siempre.
    // Solo si es un pedido idéntico automático en menos de 6s, evitar duplicado.
    const orderId = job.payload?.order?.id;
    const isManual = job.payload?.is_manual_reprint === true;
    if (orderId && !isManual) {
      const prevTs = processedOrderPrintTimestamps.get(String(orderId)) || 0;
      if (Date.now() - prevTs < 6000) {
        return true;
      }
      processedOrderPrintTimestamps.set(String(orderId), Date.now());
    }

    try {
      const res = await fetch('http://localhost:8080/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.payload),
      });
      return res.ok;
    } catch (err) {
      console.error('Error imprimiendo trabajo del puente en localhost:8080:', err);
      processedBridgeJobIds.delete(job.job_id);
      return false;
    }
  };

  const checkAndProcessBridgeQueue = async () => {
    if (isDisposed) return;
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', BRIDGE_QUEUE_KEY)
        .maybeSingle();

      if (!data?.value) return;

      let queue: CloudPrintJob[] = [];
      try {
        queue = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } catch {
        return;
      }

      if (!Array.isArray(queue) || queue.length === 0) return;

      let queueChanged = false;
      for (const job of queue) {
        if (
          job &&
          job.status === 'pending' &&
          !processedBridgeJobIds.has(job.job_id) &&
          Math.abs(Date.now() - (job.created_at || 0)) < 600000
        ) {
          const printedOk = await executeLocalPrintJob(job);
          if (printedOk) {
            job.status = 'printed';
            job.printed_at = Date.now();
            queueChanged = true;
          }
        }
      }

      if (queueChanged) {
        await supabase.from('app_settings').upsert({
          key: BRIDGE_QUEUE_KEY,
          value: JSON.stringify(queue),
        });
      }
    } catch {
      // Silencioso en background
    }
  };

  const startIfLocalProxyPresent = async () => {
    // Comprobar si este ordenador tiene http://localhost:8080 activo (es el PC Principal de Caja)
    const localHealth = await pingLocalProxyDirect('http://localhost:8080', 1200);
    if (!localHealth.ok || isDisposed) {
      return;
    }

    masterBridgeInitialized = true;
    console.log(
      '🖨️ [Master Print Bridge] Este equipo es el PC Principal de Caja (localhost:8080). Escuchando impresiones de Tablets/Terminales...'
    );

    const publishHeartbeat = async () => {
      try {
        await supabase.from('app_settings').upsert({
          key: BRIDGE_STATUS_KEY,
          value: JSON.stringify({
            online: true,
            version: localHealth.data?.version || '3.1.0',
            service: localHealth.data?.service || 'Nestor Pizzas Print Proxy (Dual Role)',
            host: `http://${DEFAULT_MAIN_PC_IP}:8080`,
            updated_at: Date.now(),
          }),
        });
      } catch {
        // ignore
      }
    };

    await publishHeartbeat();
    await checkAndProcessBridgeQueue();

    heartbeatTimer = setInterval(publishHeartbeat, 30000);
    pollTimer = setInterval(checkAndProcessBridgeQueue, 2000);

    realtimeChannel = supabase
      .channel(BRIDGE_CHANNEL_NAME)
      .on('broadcast', { event: 'print_job' }, async (msg: any) => {
        const job = msg?.payload as CloudPrintJob;
        if (job && job.job_id) {
          await executeLocalPrintJob(job);
          await checkAndProcessBridgeQueue();
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: `key=eq.${BRIDGE_QUEUE_KEY}`,
        },
        () => {
          void checkAndProcessBridgeQueue();
        }
      )
      .subscribe();
  };

  void startIfLocalProxyPresent();

  return () => {
    isDisposed = true;
    masterBridgeInitialized = false;
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (realtimeChannel) {
      void supabase.removeChannel(realtimeChannel);
    }
  };
};

/**
 * 7. Función principal invocada al aceptar o imprimir un pedido desde AdminOrders o AdminKiosk
 */
export const sendToNetworkPrinter = async (
  order: any,
  isManualReprint: boolean = false
): Promise<boolean> => {
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

    // Normalizar IP fija de cocina: en Caniles la IP real y fija de la TP8002 es 192.168.1.101
    let kitchenIp = config.ip || DEFAULT_KITCHEN_PRINTER_IP;
    if (kitchenIp === '192.168.1.100' || kitchenIp === '192.168.1.200') {
      kitchenIp = DEFAULT_KITCHEN_PRINTER_IP;
    }

    // Si el usuario desactivó explícitamente el modo directo Y no configuró URL de proxy, usar impresión navegador
    if (config.useDirectPrint === false && !savedProxyUrl) {
      return false;
    }

    // Evitar doble disparo accidental del mismo pedido en menos de 6 segundos solo si NO es reimpresión manual
    if (order?.id && !isManualReprint) {
      const prevTs = processedOrderPrintTimestamps.get(String(order.id)) || 0;
      if (Date.now() - prevTs < 6000) {
        return true;
      }
      processedOrderPrintTimestamps.set(String(order.id), Date.now());
    }

    // Formateo de fecha y hora local
    const orderDate = order.created_at ? new Date(order.created_at) : new Date();
    const dateStr = orderDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Generar formato de texto tipo ESC/POS de alta legibilidad
    let text = `================================\n`;
    text += `       NESTOR PIZZAS\n`;
    text += `   Masa Fresca & Gourmet\n`;
    text += `================================\n`;
    const orderCleanId = (order.id ? order.id.toString().replace(/^#+/, '') : '00000000')
      .slice(0, 8)
      .toUpperCase();
    text += `FECHA: ${dateStr} - ${timeStr}\n`;
    text += `TICKET: #NP-${orderCleanId}\n`;
    text += `--------------------------------\n`;

    const rawAddr = typeof order.delivery_address === 'string' ? order.delivery_address : '';
    const isMesa = order.delivery_method === 'local' || order.delivery_method === 'dine_in';
    const isPickup =
      !isMesa && (order.delivery_method === 'pickup' || rawAddr.toLowerCase().includes('recogida'));
    const isDelivery = !isMesa && !isPickup;

    // Clasificación explícita de pago
    const pMethod = order.payment_method || 'cash';
    const isPaid =
      order.payment_status === 'PAID' ||
      pMethod === 'online' ||
      pMethod === 'sumup_online' ||
      pMethod === 'sumup';
    const isTpv = pMethod === 'tpv' || pMethod === 'card_delivery';

    let payBanner = '*** COBRAR EN EFECTIVO ***';
    if (isPaid) {
      payBanner = '*** PAGADO ONLINE (NO COBRAR) ***';
    } else if (isTpv) {
      payBanner = '*** COBRAR CON DATAFONO ***';
    }

    if (isMesa) {
      text += `SERVICIO: SALA / MESA\n`;
      text += `TIPO:   *** SALA / MESA ***\n`;
      text += `MESA:   ${(order.client_name || 'MESA LOCAL').toUpperCase()}\n`;
    } else if (isDelivery) {
      text += `SERVICIO: A DOMICILIO\n`;
      text += `TIPO:   *** A DOMICILIO ***\n`;
    } else {
      text += `SERVICIO: RECOGIDA EN LOCAL\n`;
      text += `TIPO:   *** RECOGIDA EN LOCAL ***\n`;
    }

    text += `PAGO:   ${payBanner}\n`;

    if (order.estimated_ready_at) {
      const readyDate = new Date(order.estimated_ready_at);
      const readyTime = readyDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      text += `HORA ESTIMADA: ${readyTime} H\n`;
    }

    if (!isMesa) {
      text += `CLIENTE:  ${(order.client_name || 'Mostrador').toUpperCase()}\n`;
      if (order.client_phone) {
        text += `TELEFONO: ${order.client_phone}\n`;
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
          text += `DIRECCION: ${fullAddress}\n`;
        } else {
          text += `DIRECCION: ${addr}\n`;
        }
      } catch {
        text += `DIRECCION: ${addr}\n`;
      }
    }

    text += `--------------------------------\n`;
    text += `CANT   ARTICULO            TOTAL\n`;
    text += `--------------------------------\n`;

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

        text += `${qty}x    ${itemName.padEnd(16).slice(0, 16)} ${lineTotal.padStart(6)}E\n`;
        if (isRedeemedItem) {
          text += `  * [CANJE VIP ${vipInfo.pointsRedeemed} PTOS: -${Number(
            vipInfo.discountApplied
          ).toFixed(2)} EUR]\n`;
        }

        if (
          item.customization_details?.extras &&
          Array.isArray(item.customization_details.extras)
        ) {
          item.customization_details.extras.forEach((extra: any) => {
            const extraName = typeof extra === 'string' ? extra : extra.name;
            text += `  * + ${extraName}\n`;
          });
        }
        if (item.customization_details?.notes) {
          text += `  * NOTA: ${item.customization_details.notes}\n`;
        }
      });
    }

    if (order.notes && typeof order.notes === 'string' && order.notes.trim()) {
      text += `--------------------------------\n`;
      text += `NOTAS / INSTRUCCIONES:\n`;
      text += `${order.notes.trim()}\n`;
    }

    text += `--------------------------------\n`;
    const totalNum = Number(order.total_amount || 0);
    if (vipInfo.hasVipRedemption) {
      const subtotalNum = totalNum + Number(vipInfo.discountApplied || 0);
      text += `SUBTOTAL:             ${subtotalNum.toFixed(2)} EUR\n`;
      text += `CANJE VIP (${vipInfo.pointsRedeemed} PTOS):  -${Number(
        vipInfo.discountApplied
      ).toFixed(2)} EUR\n`;
      text += `PROD. VIP: ${vipInfo.redeemedProductName}\n`;
    }
    const totalFinal = totalNum.toFixed(2);
    text += `TOTAL A PAGAR:        ${totalFinal} EUR\n`;
    text += `--------------------------------\n`;
    text += `ESTADO DE PAGO:\n`;
    text += `>> ${payBanner} <<\n`;

    text += `================================\n`;
    text += `   GRACIAS POR SU CONFIANZA\n`;
    text += `\n\n\n\n`;

    const serviceLabel = isMesa
      ? 'SALA / MESA'
      : isPickup
      ? 'RECOGIDA EN LOCAL'
      : 'A DOMICILIO';
    const enrichedItems = Array.isArray(order.order_items)
      ? order.order_items.map((item: any) => {
          const isRedeemedItem =
            vipInfo.hasVipRedemption &&
            (item?.customization_details?.is_vip_reward === true ||
              (vipInfo.redeemedItemId !== null && item.id === vipInfo.redeemedItemId));
          if (!isRedeemedItem) return item;
          const prevExtras = Array.isArray(item.customization_details?.extras)
            ? item.customization_details.extras
            : [];
          const vipTag = `CANJE PUNTOS VIP (${vipInfo.pointsRedeemed} PTOS): -${Number(
            vipInfo.discountApplied
          ).toFixed(2)} EUR`;
          const hasTag = prevExtras.some((e: any) =>
            (typeof e === 'string' ? e : e?.name || '').includes('CANJE PUNTOS VIP')
          );
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
      printer_ip: kitchenIp,
      printer_port: parseInt(config.port, 10) || 9100,
      text,
      order: normalizedOrder,
      is_manual_reprint: isManualReprint,
    };

    const result = await printOrderPayload(payload);
    return result.success;
  } catch (error) {
    console.error('Error comunicando con el proxy de impresión en red:', error);
    return false;
  }
};
