import { useI18nStore } from '../store/i18nStore';
import { useHardwareBack } from '../utils/useHardwareBack';

interface SecretBurguerClosedModalProps {
  onClose: () => void;
}

const DAYS = [
  { es: 'L', en: 'M', open: false },
  { es: 'M', en: 'T', open: false },
  { es: 'X', en: 'W', open: false },
  { es: 'J', en: 'T', open: false },
  { es: 'V', en: 'F', open: true },
  { es: 'S', en: 'S', open: true },
  { es: 'D', en: 'S', open: false },
];

export default function SecretBurguerClosedModal({ onClose }: SecretBurguerClosedModalProps) {
  useHardwareBack(true, onClose);
  const { t, lang } = useI18nStore() as any;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-green-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xl font-bold p-2 bg-zinc-900 rounded-2xl border border-zinc-800 z-10 transition-colors"
        >
          ✕
        </button>

        <div className="p-6 sm:p-8 text-center">
          <span className="text-6xl mb-4 block">📅</span>
          <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-white mb-2">
            {t('secret_burguer_closed_title')}
          </h3>
          <p className="text-zinc-400 font-medium max-w-sm mx-auto mb-6">
            {t('secret_burguer_closed_desc')}
          </p>

          <div className="mb-7">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              {t('secret_burguer_schedule_label')}
            </p>
            <div className="flex items-center justify-center gap-2">
              {DAYS.map((d, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm border transition-colors ${
                    d.open
                      ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {lang === 'en' ? d.en : d.es}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl uppercase tracking-wider text-sm hover:scale-105 transition-all"
          >
            {t('back_to_menu')}
          </button>
        </div>
      </div>
    </div>
  );
}
