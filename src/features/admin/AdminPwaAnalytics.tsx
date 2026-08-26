import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface PwaInstallEvent {
  id: string;
  created_at: string;
  device_type: string;
  app_type: string;
  user_agent: string;
}

export default function AdminPwaAnalytics() {
  const [installs, setInstalls] = useState<PwaInstallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
    
    // Subscribe to new installs in real-time
    const subscription = supabase
      .channel('pwa_analytics_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pwa_analytics' }, (payload) => {
        setInstalls(prev => [payload.new as PwaInstallEvent, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('pwa_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('La tabla "pwa_analytics" aún no ha sido creada en Supabase. Sigue las instrucciones del Walkthrough para crearla.');
        } else {
          setError(error.message);
        }
      } else {
        setInstalls(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const publicInstalls = installs.filter(i => i.app_type === 'public').length;
  const adminInstalls = installs.filter(i => i.app_type === 'admin').length;
  const mobileInstalls = installs.filter(i => i.device_type === 'mobile').length;
  const desktopInstalls = installs.filter(i => i.device_type === 'desktop').length;

  return (
    <div className="p-6 text-white max-w-5xl mx-auto">
      <h2 className="text-2xl font-display font-black uppercase tracking-wider mb-6 text-green-400">
        Analíticas de Instalación PWA
      </h2>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl mb-8">
          <h3 className="text-red-400 font-bold mb-2">Error de Configuración</h3>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
          <div className="bg-[#0A0A0E] p-4 rounded-xl border border-zinc-800 font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre">
            {`-- Ejecuta esto en Supabase SQL Editor:
CREATE TABLE pwa_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_type TEXT,
  app_type TEXT,
  user_agent TEXT
);

-- Habilitar permisos para que el frontend inserte datos anónimamente
ALTER TABLE pwa_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for everyone" ON pwa_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for admins only" ON pwa_analytics FOR SELECT USING (true);`}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
              <p className="text-gray-400 text-sm font-medium mb-1">Descargas Totales</p>
              <p className="text-4xl font-black text-white">{installs.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
              <p className="text-gray-400 text-sm font-medium mb-1">App Clientes</p>
              <p className="text-3xl font-black text-green-400">{publicInstalls}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
              <p className="text-gray-400 text-sm font-medium mb-1">Kitchen POS (Admin)</p>
              <p className="text-3xl font-black text-nestor-gold">{adminInstalls}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex justify-between items-end">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Dispositivos</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Móvil</p>
                    <p className="text-xl font-bold text-blue-400">{mobileInstalls}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">PC</p>
                    <p className="text-xl font-bold text-purple-400">{desktopInstalls}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg overflow-hidden">
            <h3 className="text-lg font-bold mb-4">Registro de Actividad</h3>
            {loading ? (
              <p className="text-gray-500 animate-pulse">Cargando datos...</p>
            ) : installs.length === 0 ? (
              <p className="text-gray-500 italic">No hay descargas registradas aún. ¡Difunde la app!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase text-gray-500 font-bold tracking-wider">
                      <th className="pb-3 pr-4">Fecha</th>
                      <th className="pb-3 pr-4">App Instalada</th>
                      <th className="pb-3 pr-4">Dispositivo</th>
                      <th className="pb-3 hidden sm:table-cell">Agente</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {installs.map(install => (
                      <tr key={install.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 pr-4 text-gray-300">
                          {new Date(install.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            install.app_type === 'admin' ? 'bg-nestor-gold/20 text-nestor-gold' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {install.app_type === 'admin' ? 'KITCHEN POS' : 'CLIENTES'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-gray-300">{install.device_type === 'mobile' ? '📱 Móvil' : '💻 Escritorio'}</span>
                        </td>
                        <td className="py-3 hidden sm:table-cell text-xs text-gray-600 truncate max-w-[200px]" title={install.user_agent}>
                          {install.user_agent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
