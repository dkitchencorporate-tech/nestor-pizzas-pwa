import { useAuthStore } from '../store/authStore';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18nStore } from '../store/i18nStore';

export default function Header() {
  const { user, profile, openUserModal } = useAuthStore();
  const { promptToInstall } = usePWAInstall();
  const { lang, toggleLang, t } = useI18nStore();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-green-500/40 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8 py-3">
        {/* Marca y Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black border border-green-500/60 p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.3)] relative">
            <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas Logo Oficial 2K Fondo Negro" className="w-full h-full object-contain" />
            <div className="absolute -bottom-3 -right-3 flex items-center bg-[#0C0C12] rounded-full p-1 border border-zinc-700 shadow-xl z-50">
              <button 
                onClick={() => lang !== 'es' && toggleLang()} 
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${lang === 'es' ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                🇪🇸
              </button>
              <button 
                onClick={() => lang !== 'en' && toggleLang()} 
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${lang === 'en' ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                🇬🇧
              </button>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight text-white uppercase leading-none group-hover:text-green-400 transition-colors">
                NÉSTOR <span>PIZZAS</span>
              </h1>
              <span className="text-[9px] font-extrabold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-display border border-green-500/40">
                CANILES
              </span>
            </div>
            <p className="flex text-[11px] text-gray-300 font-medium items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"></span>
              <span>Tel: <strong className="text-white font-bold">+34 679 76 19 87</strong> • C. Alcalde Felip, 9, 18810 Caniles</span>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 sm:gap-2.5 ml-auto">
          <button onClick={promptToInstall} className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-nestor-gold to-yellow-400 text-black font-display font-bold text-sm shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 transition-transform uppercase tracking-widest border border-yellow-300/50">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>INSTALAR APP</span>
          </button>
          <button onClick={promptToInstall} className="md:hidden flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-nestor-gold text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all hover:scale-105 shrink-0">
            <svg className="w-5 h-5 sm:w-4 sm:h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>

          <a href="tel:+34679761987" className="flex bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-xl w-10 h-10 sm:w-auto sm:px-3.5 sm:py-2 text-sm font-display font-bold items-center justify-center gap-1.5 shadow transition-all shrink-0">
            <svg className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            <span className="hidden sm:inline">{t('contact')}</span>
          </a>
          
          <div onClick={() => openUserModal()} className="cursor-pointer flex bg-[#14141E] hover:bg-[#1E1E2C] border border-green-500/40 rounded-xl w-10 h-10 sm:w-auto sm:px-3 sm:py-1.5 items-center justify-center gap-2 transition-all shadow shrink-0">
            {user ? (
              <>
                <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center font-display font-bold text-xs sm:text-[10px] shrink-0">👤</div>
                <span className="hidden sm:inline text-sm font-bold text-white uppercase truncate max-w-[120px]">
                  HOLA, {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'USUARIO'}
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center font-display font-bold text-xs sm:text-[10px] shrink-0">🔑</div>
                <span className="hidden sm:inline text-sm font-bold text-white uppercase">{t('login')}</span>
              </>
            )}
          </div>
          
          {user && (
            <button onClick={() => window.dispatchEvent(new Event('open-tracking'))} className="cursor-pointer flex bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 rounded-xl w-10 h-10 items-center justify-center transition-all shadow shrink-0 text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
          )}
        </div>
      </div>


    </header>
  );
}
