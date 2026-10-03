import { useEffect } from 'react';
import { useI18nStore } from '../store/i18nStore';

// Pantalla de prelanzamiento: ocupa toda la vista y no tiene forma de cerrarse.
// App.tsx la muestra en lugar de cualquier vista pública (carta, registro,
// seguimiento…) mientras PRELAUNCH_ACTIVE sea true. No toca la base de datos.

// ─── INTERRUPTOR DEL PRELANZAMIENTO ───────────────────────────────────────────
// true  → la web pública muestra solo esta pantalla (carta, registro, seguimiento).
// false → la web vuelve a funcionar con normalidad.
// Para el lanzamiento: cambiar a false y desplegar (o revertir este cambio).
export const PRELAUNCH_ACTIVE = true;

const WHATSAPP_URL = 'https://wa.me/34679761987';
const PHONE_LABEL = '+34 679 76 19 87';
// Dejar vacío para ocultar el enlace hasta tener la cuenta oficial confirmada.
const INSTAGRAM_URL = '';

export default function PreLaunchScreen() {
  const { t } = useI18nStore() as any;

  // Sin scroll de fondo mientras la pantalla está activa.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <main
      role="main"
      aria-labelledby="prelaunch-title"
      className="fixed inset-0 z-[5000] overflow-hidden bg-[#0A0A0E] text-white flex flex-col items-center justify-center px-6 text-center select-none"
    >
      {/* Viñeta y halos de marca */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#14141C_0%,_#0A0A0E_55%,_#09090D_100%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-[#22C55E]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-[#FF3B00]/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-[fadeIn_0.8s_ease-out]">
        {/* Logo oficial, mismo tratamiento que el splash */}
        <div className="relative mb-10">
          <div className="absolute inset-0 -m-3 rounded-full border-t-2 border-l border-[#22C55E]/70 animate-[spin_6s_linear_infinite]" />
          <div className="w-28 h-28 sm:w-36 sm:h-36 bg-black rounded-full border-2 border-[#22C55E]/40 shadow-[0_0_40px_rgba(34,197,94,0.25)] overflow-hidden flex items-center justify-center">
            <img
              src="/assets/brand/logo_black_exact_2k.png"
              alt="Néstor Pizzas"
              className="w-[120%] h-[120%] object-cover mix-blend-screen max-w-none"
              draggable={false}
            />
          </div>
        </div>

        <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-[#FF3B00]/40 bg-[#FF3B00]/10 text-[#FF3B00] text-[10px] sm:text-xs font-display font-black uppercase tracking-[0.25em]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B00] animate-pulse" />
          {t('prelaunch_badge')}
        </span>

        <h1 id="prelaunch-title" className="font-display font-black uppercase text-3xl sm:text-4xl tracking-wide leading-tight">
          Néstor <span className="text-[#22C55E]">Pizzas</span>
        </h1>

        <p className="mt-5 text-zinc-300 text-base sm:text-lg font-medium leading-relaxed">
          {t('prelaunch_title')}
        </p>
        <p className="mt-2 text-zinc-500 text-sm leading-relaxed">
          {t('prelaunch_desc')}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-black font-display font-black uppercase tracking-wider text-sm transition-all hover:scale-105"
          >
            WhatsApp · {PHONE_LABEL}
          </a>
          {INSTAGRAM_URL && (
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-zinc-700 hover:border-[#22C55E]/60 text-zinc-200 font-display font-bold uppercase tracking-wider text-sm transition-all"
            >
              Instagram
            </a>
          )}
        </div>
      </div>

      <p className="absolute bottom-6 inset-x-0 text-[10px] uppercase tracking-[0.3em] text-zinc-600">
        {t('prelaunch_footer')}
      </p>
    </main>
  );
}
