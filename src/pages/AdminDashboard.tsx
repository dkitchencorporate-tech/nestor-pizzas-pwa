import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import AdminOrders from '../features/admin/AdminOrders';
import AdminCatalog from '../features/admin/AdminCatalog';
import AdminKiosk from '../features/admin/AdminKiosk';
import AdminAnalytics from '../features/admin/AdminAnalytics';
import AdminHistory from '../features/admin/AdminHistory';
import AdminPrinterSettings from '../features/admin/AdminPrinterSettings';
import AdminPwaAnalytics from '../features/admin/AdminPwaAnalytics';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAdminUiStore } from '../store/adminUiStore';

export default function AdminDashboard() {
  const { t } = useI18nStore();
  const { user, profile, signIn } = useAuthStore();
  const { activeTab, setActiveTab } = useAdminUiStore();
  const [isSaturated, setIsSaturated] = useState(false);
  const [isStoreClosed, setIsStoreClosed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { promptToInstall } = usePWAInstall();

  // Admin Auth State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!user || !profile?.is_admin) return;
    
    // Fetch initial state
    const fetchMode = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', ['saturation_mode', 'store_closed']);
      if (data) {
        const sat = data.find(s => s.key === 'saturation_mode');
        const closed = data.find(s => s.key === 'store_closed');
        if (sat && sat.value === 'true') setIsSaturated(true);
        if (closed && closed.value === 'true') setIsStoreClosed(true);
      }
    };
    fetchMode();
  }, [user, profile]);

  const toggleSaturationMode = async () => {
    const newStatus = !isSaturated;
    setIsSaturated(newStatus);
    await supabase.from('app_settings').upsert({ key: 'saturation_mode', value: newStatus ? 'true' : 'false' });
  };
  
  const toggleStoreStatus = async () => {
    const newStatus = !isStoreClosed;
    setIsStoreClosed(newStatus);
    await supabase.from('app_settings').upsert({ key: 'store_closed', value: newStatus ? 'true' : 'false' });
  };
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      await signIn(adminEmail.trim(), adminPassword);
    } catch (err: any) {
      setAdminError(err.message || t('login_error'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!adminEmail) {
      setAdminError(t('enter_email_to_reset'));
      return;
    }
    setAdminError('');
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(adminEmail.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    });
    setIsResetting(false);
    if (error) {
      setAdminError(error.message);
    } else {
      setAdminError(t('email_sent_instructions'));
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
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white">{t('restricted_access')}</h1>
            <p className="text-sm text-gray-400 mt-2">{t('admin_portal_title')}</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {adminError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {adminError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('email')}</label>
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('password')}</label>
              <div className="relative w-full">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 pr-12 text-white transition-colors outline-none"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-zinc-700 text-green-500 bg-[#0A0A0E] focus:ring-green-500 focus:ring-offset-black" />
                <span className="text-xs text-gray-400 font-medium">{t('remember_me')}</span>
              </label>
              <button 
                type="button" 
                onClick={handleResetPassword} 
                disabled={isResetting || !adminEmail} 
                className="text-sm text-zinc-500 hover:text-green-500 transition-colors w-full text-center disabled:opacity-50"
              >
                {isResetting ? t('sending') : t('forgot_password')}
              </button>
            </div>

            <button 
              type="submit"
              disabled={adminLoading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.3)]"
            >
              {adminLoading ? t('loading') : t('sign_in')}
            </button>
            
            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-medium uppercase">{t('or_also')}</span>
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
              {t('continue_with_google')}
            </button>
          </form>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          {t('back_to_shop')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col md:flex-row font-sans relative print:bg-white print:text-black">
      
      {/* Mobile Toggle Button overlay if sidebar is closed */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute bottom-4 left-4 z-50 p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white shadow-2xl hover:bg-zinc-800 transition-colors print:hidden"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      )}

      {/* Sidebar Menú */}
      <aside className={`${isSidebarOpen ? 'w-full md:w-64' : 'hidden'} bg-[#14141E] border-r border-zinc-800 flex flex-col transition-all duration-300 relative z-40 print:hidden`}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] p-0.5">
              <img src="./assets/brand/logo_black_exact_2k.png" alt="Nestor Pizzas" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-display font-black uppercase text-sm tracking-widest leading-none">Kitchen POS</h1>
              <p className="text-[10px] text-green-400 font-mono mt-0.5">v2.0 Enterprise</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            📋 {t('orders')}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            🗄️ {t('history')}
          </button>
          <button 
            onClick={() => setActiveTab('kiosk')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'kiosk' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            🍕 {t('kiosk')}
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'catalog' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            ⚙️ {t('catalog')}
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            📊 {t('analytics')}
          </button>
          <button
            onClick={() => { setActiveTab('printers'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'printers' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            🖨️ <span className="uppercase tracking-wider">Impresoras</span>
          </button>

          <button
            onClick={() => { setActiveTab('pwa'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'pwa' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:bg-zinc-800/50 hover:text-white'}`}
          >
            📱 <span className="uppercase tracking-wider">PWA Analytics</span>
          </button>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <button 
              onClick={promptToInstall}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-nestor-gold to-yellow-400 text-black font-display font-bold text-sm shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 transition-transform uppercase tracking-widest border border-yellow-300/50 justify-center"
            >
              <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('install_app')}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="bg-[#1A1A24] rounded-xl p-3 border border-zinc-700/50">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('emergency_closure')}</h4>
            <button 
              onClick={toggleStoreStatus}
              className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-lg ${isStoreClosed ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20'}`}
            >
              {isStoreClosed ? t('store_closed_open') : t('close_store')}
            </button>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-3 border border-zinc-700/50">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('saturation_mode')}</h4>
            <button 
              onClick={toggleSaturationMode}
              className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${isSaturated ? 'bg-orange-500/20 text-orange-500 border-orange-500/50' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-800'}`}
            >
              {isSaturated ? '🚨 Restaurar Flujo' : 'Activar (+1h Espera)'}
            </button>
          </div>
          <div className="p-4 border-t border-zinc-800">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-zinc-800 transition-colors text-xs uppercase"
            >
              Volver a la Tienda
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden relative print:h-auto print:overflow-visible print:block">
        <div className={activeTab === 'orders' ? 'block h-full' : 'hidden'}><AdminOrders /></div>
        <div className={activeTab === 'history' ? 'block h-full' : 'hidden'}><AdminHistory /></div>
        <div className={activeTab === 'kiosk' ? 'block h-full' : 'hidden'}><AdminKiosk /></div>
        <div className={activeTab === 'catalog' ? 'block h-full' : 'hidden'}><AdminCatalog /></div>
        <div className={activeTab === 'analytics' ? 'block h-full' : 'hidden'}><AdminAnalytics /></div>
        <div className={activeTab === 'pwa' ? 'block h-full overflow-y-auto pt-16 sm:pt-4' : 'hidden'}><AdminPwaAnalytics /></div>
        <div className={activeTab === 'printers' ? 'block h-full overflow-y-auto pt-16 sm:pt-4' : 'hidden'}>
          <div className="p-4 sm:p-8">
            <AdminPrinterSettings />
          </div>
        </div>
      </main>
      
    </div>
  );
}
