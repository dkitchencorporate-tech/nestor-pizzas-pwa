import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'es' | 'en';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
  };
}

// Diccionario base de traducciones
const dictionary: Translations = {
  catalog: { es: 'Catálogo', en: 'Catalog' },
  offers: { es: 'Ofertas', en: 'Offers' },
  contact: { es: 'Contacto', en: 'Contact' },
  profile: { es: 'Mi Perfil', en: 'My Profile' },
  cart: { es: 'Carrito', en: 'Cart' },
  login: { es: 'Iniciar Sesión', en: 'Login' },
  register: { es: 'Regístrate', en: 'Sign Up' },
  empty_cart: { es: 'El carrito está vacío', en: 'Your cart is empty' },
  total: { es: 'Total', en: 'Total' },
  pay: { es: 'Pagar', en: 'Checkout' },
  delivery: { es: 'A domicilio', en: 'Delivery' },
  pickup: { es: 'Recogida en local', en: 'Pickup' },
  local: { es: 'Local / Mesa', en: 'Dine-in' },
  promo_title: { es: 'JUEVES LOCOS', en: 'CRAZY THURSDAYS' },
  promo_subtitle: { es: '2 PIZZAS X 11,00 €', en: '2 PIZZAS FOR 11.00 €' },
  promo_desc: { es: 'Cada jueves disfruta de dos pizzas de 33cm recién horneadas con hasta 3 ingredientes artesanos al mejor precio de la comarca.', en: 'Every Thursday enjoy two freshly baked 33cm pizzas with up to 3 artisan ingredients at the best price in town.' },
  promo_btn: { es: '¡Aprovechar Promo Jueves! →', en: 'Get Thursday Promo! →' },
  menu_btn: { es: 'Ver Menú Completo', en: 'View Full Menu' },
};

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'es',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === 'es' ? 'en' : 'es' })),
      t: (key) => {
        const lang = get().lang;
        return dictionary[key]?.[lang] || key;
      },
    }),
    {
      name: 'nestor-i18n-storage',
    }
  )
);
