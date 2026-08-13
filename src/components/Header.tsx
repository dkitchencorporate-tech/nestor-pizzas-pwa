import { useAuthStore } from '../store/authStore';

export default function Header() {
  const { openUserModal } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-green-500/40 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8 py-3">
        {/* Marca y Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black border border-green-500/60 p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.3)] relative">
            <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas Logo Oficial 2K Fondo Negro" className="w-full h-full object-contain" />
            <button className="absolute -bottom-2 -right-2 text-xl drop-shadow-md hover:scale-110 transition-transform bg-[#0C0C12] rounded-full p-1 border border-zinc-700 z-50">
              🇬🇧
            </button>
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
              <span>Tel: <strong className="text-white font-bold">679 76 19 87</strong> • Calle Alcalde Felip, 9</span>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 sm:gap-2.5 ml-auto">
          <button className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-nestor-gold to-yellow-400 text-black font-display font-bold text-sm shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 transition-transform uppercase tracking-widest border border-yellow-300/50">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>INSTALAR APP</span>
          </button>
          <button className="md:hidden flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-nestor-gold text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all hover:scale-105 shrink-0">
            <svg className="w-5 h-5 sm:w-4 sm:h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>

          <a href="https://wa.me/34679761987?text=Hola%20N%C3%A9stor%20Pizzas,%20quisiera%20hacer%20un%20pedido" target="_blank" rel="noreferrer" className="flex bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/40 rounded-xl w-10 h-10 sm:w-auto sm:px-3.5 sm:py-2 text-sm font-display font-bold items-center justify-center gap-1.5 shadow transition-all shrink-0">
            <svg className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.124.557 4.122 1.543 5.864l-1.636 5.988 6.136-1.61c1.688.92 3.633 1.458 5.694 1.458 6.627 0 12-5.373 12-12 0-6.628-5.373-12-11.737-12z"/></svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          
          <div onClick={() => openUserModal()} className="cursor-pointer flex bg-[#14141E] hover:bg-[#1E1E2C] border border-green-500/40 rounded-xl w-10 h-10 sm:w-auto sm:px-3 sm:py-1.5 items-center justify-center gap-2 transition-all shadow shrink-0">
            <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center font-display font-bold text-xs sm:text-[10px] shrink-0">🔑</div>
            <span className="hidden sm:inline text-sm font-bold text-white">INICIAR SESIÓN</span>
          </div>
        </div>
      </div>


    </header>
  );
}
