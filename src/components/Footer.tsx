import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';

export default function Footer() {
  const { openUserModal } = useAuthStore();
  const { t } = useI18nStore() as any;

  return (
    <footer className="border-t border-zinc-800 bg-[#0A0A0E] px-4 sm:px-8 py-8 mt-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="text-white font-display font-black text-sm uppercase tracking-wider">Néstor Pizzas Gourmet</p>
          <p className="text-zinc-500 text-xs mt-1">
            Calle Alcalde Felip, 9 &bull; 18810 Caniles (Granada) &bull; CIF B-18810992
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <button onClick={() => openUserModal('legal')} className="text-zinc-400 hover:text-green-400 transition-colors uppercase tracking-wider font-bold">
            {t('legal_footer')}
          </button>
          <a href="tel:+34679761987" className="text-zinc-400 hover:text-green-400 transition-colors">
            +34 679 76 19 87
          </a>
        </div>
      </div>
    </footer>
  );
}
