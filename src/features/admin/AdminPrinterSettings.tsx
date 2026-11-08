import React, { useState, useEffect } from 'react';
import {
  getPrinterProxyUrl,
  savePrinterProxyUrl,
  testProxyHealth,
  autoDiscoverPrinterServer,
  printOrderPayload,
  normalizeProxyBaseUrl,
  DEFAULT_MAIN_PC_IP,
  DEFAULT_KITCHEN_PRINTER_IP,
  CONFIG_STORAGE_KEY,
} from '../../utils/printerService';

interface AdminPrinterSettingsProps {
  onClose?: () => void;
}

export default function AdminPrinterSettings({ onClose }: AdminPrinterSettingsProps) {
  const [ipAddress, setIpAddress] = useState(DEFAULT_KITCHEN_PRINTER_IP);
  const [port, setPort] = useState('9100');
  const [useDirectPrint, setUseDirectPrint] = useState(true);
  const [proxyUrl, setProxyUrl] = useState<string>(() => getPrinterProxyUrl());
  const [status, setStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const currentProxy = getPrinterProxyUrl();
    setProxyUrl(currentProxy);

    const rawConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (rawConfig) {
      try {
        const parsed = JSON.parse(rawConfig);
        const savedIp = parsed.ip;
        if (savedIp && savedIp !== '192.168.1.100' && savedIp !== '192.168.1.200') {
          setIpAddress(savedIp);
        } else {
          setIpAddress(DEFAULT_KITCHEN_PRINTER_IP);
        }
        if (parsed.port) setPort(parsed.port);
        if (parsed.useDirectPrint !== undefined) setUseDirectPrint(parsed.useDirectPrint);
      } catch (e) {
        console.error('Error parsing printer config', e);
      }
    }

    // Prueba pasiva de salud al abrir la pantalla de impresoras
    setStatus('testing');
    setStatusText('Verificando comunicación con el servidor de impresión...');
    testProxyHealth(currentProxy, 1500).then((res) => {
      if (res.ok && res.data) {
        savePrinterProxyUrl(currentProxy);
        setStatus('online');
        setStatusText(
          `Conectado y operativo: ${res.data.service || 'Nestor Pizzas Print Proxy'} (v${res.data.version || '3.1.0'})`
        );
      } else {
        setStatus('offline');
        setStatusText(
          'Sin respuesta automática. Si estás en la Tablet, pulsa "📱 Tablet / Terminal 2" o "🔍 Auto-Detectar".'
        );
      }
    });
  }, []);

  const persistCurrentSettings = (targetProxyUrl: string, directPrintEnabled = useDirectPrint) => {
    const cleanBase = normalizeProxyBaseUrl(targetProxyUrl) || `http://${DEFAULT_MAIN_PC_IP}:8080`;
    setProxyUrl(cleanBase);
    savePrinterProxyUrl(cleanBase, {
      printerIp: ipAddress,
      printerPort: port,
      useDirectPrint: directPrintEnabled,
    });
  };

  const handleQuickSelect = async (targetUrl: string) => {
    setUseDirectPrint(true);
    persistCurrentSettings(targetUrl, true);
    setStatus('testing');
    setStatusText(`Comprobando conexión con ${targetUrl}...`);

    const res = await testProxyHealth(targetUrl, 1800);
    if (res.ok && res.data) {
      setStatus('online');
      setStatusText(
        `¡Terminal vinculado y conectado! ${res.data.service || 'Proxy TPV'} (v${res.data.version || '3.1.0'})`
      );
    } else {
      setStatus('offline');
      setStatusText(
        `Dirección fijada en ${targetUrl}. (Aviso: ${res.error || 'Verifica que el PC de caja esté encendido y en la misma red Wi-Fi'})`
      );
    }
  };

  const handleAutoDiscover = async () => {
    setIsScanning(true);
    setUseDirectPrint(true);
    setStatus('testing');
    setStatusText('Iniciando búsqueda automática del PC de Caja en la red Wi-Fi...');

    const detected = await autoDiscoverPrinterServer((progressMsg) => {
      setStatusText(progressMsg);
    });

    setIsScanning(false);

    if (detected) {
      persistCurrentSettings(detected, true);
      setStatus('online');
      setStatusText(`¡Servidor detectado y guardado automáticamente! (${detected})`);
    } else {
      setStatus('offline');
      setStatusText(
        'No se encontró ningún servidor proxy activo en la red Wi-Fi. Verifica que el PC de caja esté encendido y conectado al mismo Wi-Fi.'
      );
    }
  };

  const handleTestConnection = async () => {
    const cleanBase = normalizeProxyBaseUrl(proxyUrl);
    setStatus('testing');
    setStatusText(`Comprobando comunicación con ${cleanBase}...`);

    const res = await testProxyHealth(cleanBase, 2200);
    if (res.ok && res.data) {
      persistCurrentSettings(cleanBase, true);
      setStatus('online');
      setStatusText(
        `¡Conexión Exitosa! ${res.data.service || 'Nestor Pizzas Proxy'} (v${res.data.version || '3.1.0'}) — Listo para imprimir.`
      );
    } else {
      setStatus('offline');
      setStatusText(
        `Fallo de conexión con ${cleanBase}: ${res.error}. Si estás en la Tablet, asegúrate de seleccionar "📱 Tablet / Terminal 2" (http://${DEFAULT_MAIN_PC_IP}:8080).`
      );
    }
  };

  const handleTestPrint = async () => {
    if (!useDirectPrint) {
      window.print();
      return;
    }

    const cleanBase = normalizeProxyBaseUrl(proxyUrl);
    persistCurrentSettings(cleanBase, true);
    setStatus('testing');
    setStatusText(`Enviando ticket de prueba a ${cleanBase}/print...`);

    const payload = {
      printer_ip: ipAddress || DEFAULT_KITCHEN_PRINTER_IP,
      printer_port: parseInt(port, 10) || 9100,
      text:
        '================================\n' +
        '       NESTOR PIZZAS\n' +
        '   TEST MULTI-TERMINAL OK\n' +
        '================================\n' +
        `SERVIDOR: ${cleanBase}\n` +
        'Impresora TP8002 Configurada Correctamente.\n\n\n\n\n',
    };

    const result = await printOrderPayload(payload);
    if (result.success) {
      setStatus('online');
      setStatusText('🖨️ ¡Ticket de prueba enviado e impreso correctamente en las impresoras del local!');
    } else {
      setStatus('offline');
      setStatusText(result.error || 'No se pudo enviar el ticket de prueba.');
    }
  };

  const handleSave = () => {
    persistCurrentSettings(proxyUrl, useDirectPrint);
    setSaved(true);
    setStatusText(`Configuración guardada en este dispositivo: ${normalizeProxyBaseUrl(proxyUrl)}`);
    setTimeout(() => setSaved(false), 3000);
    if (onClose) onClose();
  };

  const isLocalhostSelected = proxyUrl.includes('localhost') || proxyUrl.includes('127.0.0.1');
  const isMainPcIpSelected = proxyUrl.includes(DEFAULT_MAIN_PC_IP);

  return (
    <div className="bg-[#14141E] p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl max-w-xl w-full mx-auto text-white space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-start gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider text-green-500 flex items-center gap-2.5">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Configuración Impresora TP8002</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Arquitectura Multi-Terminal (PC Principal de Caja + Tablets / Móviles por Wi-Fi)
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            ✕
          </button>
        )}
      </div>

      {/* Switch Modo Directo LAN */}
      <div
        className="flex items-center gap-3 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all"
        onClick={() => setUseDirectPrint(!useDirectPrint)}
      >
        <input
          type="checkbox"
          checked={useDirectPrint}
          onChange={() => {}}
          className="w-5 h-5 accent-green-500 shrink-0"
        />
        <div>
          <p className="font-bold text-sm text-white">Modo de Red Independiente (Directo LAN / Wi-Fi)</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Envía las comandas directamente al servidor de impresión del PC de caja (Cocina `192.168.1.101` + Mostrador `TICKET`) sin cuadros de diálogo del navegador.
          </p>
        </div>
      </div>

      {useDirectPrint && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-5">
          {/* 1. Selector Rápido de Tipo de Dispositivo */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-300 mb-2.5">
              1. Selecciona qué dispositivo estás configurando ahora:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickSelect('http://localhost:8080')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  isLocalhostSelected
                    ? 'bg-green-500/15 border-2 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <span className="text-2xl">🖥️</span>
                <div>
                  <span className="font-black text-xs sm:text-sm uppercase block">Este PC (Caja Principal)</span>
                  <span className="text-[11px] font-mono text-green-400 block">http://localhost:8080</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect(`http://${DEFAULT_MAIN_PC_IP}:8080`)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  isMainPcIpSelected
                    ? 'bg-blue-500/15 border-2 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <span className="text-2xl">📱</span>
                <div>
                  <span className="font-black text-xs sm:text-sm uppercase block">Tablet / Terminal 2</span>
                  <span className="text-[11px] font-mono text-blue-400 block">http://{DEFAULT_MAIN_PC_IP}:8080</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Dirección del Servidor Proxy + Auto-Detectar */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-300 mb-2">
              2. Dirección del Servidor Proxy (PC de Caja):
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder={`http://${DEFAULT_MAIN_PC_IP}:8080`}
                className="flex-1 bg-black border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAutoDiscover}
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                {isScanning ? '⏳ Buscando...' : '🔍 Auto-Detectar'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              En el ordenador de caja usa <code className="text-green-400">http://localhost:8080</code>. En cualquier Tablet o móvil conectado al Wi-Fi de la pizzería usa <code className="text-blue-400">http://{DEFAULT_MAIN_PC_IP}:8080</code>.
            </p>
          </div>

          {/* 3. Panel de Estado Dinámico */}
          {statusText && (
            <div
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
                status === 'online'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : status === 'offline'
                  ? 'bg-red-500/15 border-red-500/40 text-red-300'
                  : 'bg-blue-500/15 border-blue-500/40 text-blue-200'
              }`}
            >
              <span className="text-base shrink-0">
                {status === 'online' ? '✅' : status === 'offline' ? '❌' : '⏳'}
              </span>
              <span className="leading-snug">{statusText}</span>
            </div>
          )}

          {/* 4. Parámetros Hardware Cocina (Avanzado) */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                IP Impresora Cocina (LAN)
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:border-green-500 outline-none"
                placeholder="192.168.1.101"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Puerto TCP Cocina
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:border-green-500 outline-none"
                placeholder="9100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isScanning}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-zinc-700"
        >
          🔌 Prueba de Conexión
        </button>

        <button
          type="button"
          onClick={handleTestPrint}
          disabled={isScanning}
          className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-amber-500/30"
        >
          🖨️ Imprimir Ticket Prueba
        </button>

        <button
          type="button"
          onClick={handleSave}
          className={`flex-1 font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
          }`}
        >
          {saved ? '✅ ¡Guardado!' : '💾 Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}
