import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import AdminOrders from '../features/admin/AdminOrders';
import AdminCatalog from '../features/admin/AdminCatalog';
import AdminKiosk from '../features/admin/AdminKiosk';
import AdminAnalytics from '../features/admin/AdminAnalytics';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const { user, profile, signIn } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'kiosk' | 'catalog' | 'analytics'>('orders');
  const [isSaturated, setIsSaturated] = useState(false);

  // Admin Auth State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (!user || !profile?.is_admin) return;
    
    // Fetch initial state
    const fetchMode = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('key', 'saturation_mode').single();
      if (data && data.value === 'true') {
        setIsSaturated(true);
      }
    };
    fetchMode();
  }, [user, profile]);

  const toggleSaturationMode = async () => {
    const newStatus = !isSaturated;
    setIsSaturated(newStatus);
    await supabase.from('app_settings').upsert({ key: 'saturation_mode', value: newStatus ? 'true' : 'false' });
  };  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      await signIn(adminEmail, adminPassword);
    } catch (err: any) {
      setAdminError(err.message || 'Error de inicio de sesión');
    } finally {
      setAdminLoading(false);
    }
  };

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-6 relative">
        
        <div className="w-full max-w-md bg-[#14141E] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Accent border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-green-600"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white">Acceso Restringido</h1>
            <p className="text-sm text-gray-400 mt-2">Portal exclusivo de administración Kitchen POS</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {adminError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {adminError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Autorizado</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                required
                className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-white transition-colors outline-none"
                placeholder="admin@nestorpizzas.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contraseña</label>
              <input 
                type="password" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
                className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-white transition-colors outline-none"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={adminLoading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.3)]"
            >
              {adminLoading ? 'Comprobando...' : 'Entrar al Sistema'}
            </button>
            
            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-medium">O TAMBIÉN</span>
                <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.origin + '/admin' }
                });
                if (error) setAdminError(error.message);
              }}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-all hover:bg-gray-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </form>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver a la tienda pública
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Menú */}
      <aside className="w-full md:w-64 bg-[#14141E] border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            <span className="font-display font-black text-xl text-black">N</span>
          </div>
          <div>
            <h1 className="font-display font-black uppercase text-sm tracking-widest">Kitchen POS</h1>
            <p className="text-[10px] text-green-400 font-mono">v2.0 Enterprise</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            📋 Cocina (Pedidos)
          </button>
          <button 
            onClick={() => setActiveTab('kiosk')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'kiosk' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            🍕 TPV (Local)
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'catalog' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            ⚙️ Kill-Switch (Carta)
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            📊 Ventas y BD
          </button>
        </nav>

        {/* Global Controls */}
        <div className="p-4 border-t border-zinc-800">
          <div className="bg-[#1A1A24] rounded-xl p-4 border border-zinc-700/50">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Modo Saturación</h4>
            <button 
              onClick={toggleSaturationMode}
              className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${isSaturated ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20'}`}
            >
              {isSaturated ? '🚨 Restaurar Flujo' : 'Activar (+1h Espera)'}
            </button>
            <p className="text-[9px] text-gray-500 mt-2 text-center leading-tight">
              Avisa a los clientes web que el tiempo de entrega superará 1 hora.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full mt-4 py-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            Volver a la Tienda
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden bg-[#0A0A0E]">
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'catalog' && <AdminCatalog />}
        {activeTab === 'kiosk' && <AdminKiosk />}
        {activeTab === 'analytics' && <AdminAnalytics />}
      </main>
      
    </div>
  );
}
