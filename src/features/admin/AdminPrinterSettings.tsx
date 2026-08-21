import React, { useState, useEffect } from 'react';

interface AdminPrinterSettingsProps {
  onClose?: () => void;
}

export default function AdminPrinterSettings({ onClose }: AdminPrinterSettingsProps) {
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [useDirectPrint, setUseDirectPrint] = useState(false);
  const [relayUrl, setRelayUrl] = useState('http://localhost:8080/print');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = localStorage.getItem('nestor_printer_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        if (parsed.ip) setIpAddress(parsed.ip);
        if (parsed.port) setPort(parsed.port);
        if (parsed.useDirectPrint !== undefined) setUseDirectPrint(parsed.useDirectPrint);
        if (parsed.relayUrl) setRelayUrl(parsed.relayUrl);
      } catch (e) {
        console.error('Error parsing printer config', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('nestor_printer_config', JSON.stringify({
      ip: ipAddress,
      port,
      useDirectPrint,
      relayUrl
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestPrint = async () => {
    if (!useDirectPrint) {
      window.print();
      return;
    }

    try {
      const payload = {
        printer_ip: ipAddress,
        printer_port: parseInt(port),
        text: "NESTOR PIZZAS\nTEST DE IMPRESION RED DIRECTA\n-------------------------\nImpresora TP8002 Configurada Correctamente.\n\n\n\n\n\n"
      };

      const res = await fetch(relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Comando enviado exitosamente a la impresora local.");
      } else {
        alert("Error de red al conectar con el servidor proxy de impresión.");
      }
    } catch (error) {
      alert("No se pudo contactar al proxy de impresión local (" + relayUrl + "). Asegúrate de que el script de relay esté ejecutándose en este ordenador.");
    }
  };

  return (
    <div className="bg-[#14141E] p-6 rounded-3xl border border-zinc-800 shadow-xl max-w-lg w-full mx-auto text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-green-500 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Configuración Impresora TP8002
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800 cursor-pointer" onClick={() => setUseDirectPrint(!useDirectPrint)}>
          <input type="checkbox" checked={useDirectPrint} onChange={() => {}} className="w-5 h-5 accent-green-500" />
          <div>
            <p className="font-bold text-sm">Modo de Red Independiente (Directo LAN)</p>
            <p className="text-xs text-zinc-400">Envía comandos crudos (ESC/POS) usando un proxy local, sin depender del cuadro de diálogo del navegador ni interferir con Iavanza.</p>
          </div>
        </div>

        {useDirectPrint && (
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">IP Impresora Local</label>
                <input 
                  type="text" 
                  value={ipAddress} 
                  onChange={e => setIpAddress(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm focus:border-green-500 outline-none"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Puerto (TCP)</label>
                <input 
                  type="text" 
                  value={port} 
                  onChange={e => setPort(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm focus:border-green-500 outline-none"
                  placeholder="9100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">URL del Proxy Node.js Local</label>
              <input 
                type="text" 
                value={relayUrl} 
                onChange={e => setRelayUrl(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm focus:border-green-500 outline-none"
                placeholder="http://localhost:8080/print"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Requiere un pequeño script en el PC de caja para saltar las restricciones de seguridad del navegador y abrir un Socket TCP a la IP de la impresora.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button 
            onClick={handleTestPrint}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
          >
            Prueba de Conexión
          </button>
          <button 
            onClick={handleSave}
            className={`flex-1 font-bold py-3 rounded-xl text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-green-500 text-black hover:bg-green-400'}`}
          >
            {saved ? '¡Guardado!' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
