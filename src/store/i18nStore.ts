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
  // General
  catalog: { es: 'Catálogo', en: 'Catalog' },
  offers: { es: 'Ofertas', en: 'Offers' },
  contact: { es: 'Contacto', en: 'Contact' },
  profile: { es: 'Mi Perfil', en: 'My Profile' },
  login: { es: 'Iniciar Sesión', en: 'Login' },
  register: { es: 'Regístrate', en: 'Sign Up' },
  logout: { es: 'Cerrar Sesión', en: 'Log Out' },
  email: { es: 'Correo Electrónico', en: 'Email' },
  password: { es: 'Contraseña', en: 'Password' },
  name: { es: 'Nombre', en: 'Name' },
  phone: { es: 'Teléfono', en: 'Phone' },
  forgot_password: { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' },
  no_account: { es: '¿No tienes cuenta?', en: "Don't have an account?" },
  have_account: { es: '¿Ya tienes cuenta?', en: 'Already have an account?' },
  my_orders: { es: 'Mis Pedidos', en: 'My Orders' },
  edit_profile: { es: 'Editar Perfil', en: 'Edit Profile' },
  delete_account: { es: 'Eliminar Cuenta', en: 'Delete Account' },
  street: { es: 'Calle / Avenida', en: 'Street / Avenue' },
  number: { es: 'Número / Piso / Puerta', en: 'Number / Apt / Door' },
  postal_code: { es: 'Código Postal', en: 'Postal Code' },
  notes: { es: 'Instrucciones de entrega', en: 'Delivery Instructions' },
  check_email: { es: 'Revisa tu correo', en: 'Check your email' },
  check_email_desc: { es: 'Te hemos enviado un enlace de confirmación.', en: "We've sent you a confirmation link." },
  close: { es: 'Cerrar', en: 'Close' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  save: { es: 'Guardar', en: 'Save' },
  confirm: { es: 'Confirmar', en: 'Confirm' },

  // Catalog Level
  saturation_mode: { es: '⚠️ MODO SATURACIÓN ACTIVO: Los pedidos tardarán más de 1 hora. Disculpen las molestias.', en: '⚠️ HIGH DEMAND MODE: Orders will take over 1 hour. We apologize for the inconvenience.' },
  full_menu: { es: 'MENÚ COMPLETO', en: 'FULL MENU' },
  order_now: { es: 'PEDIR AHORA', en: 'ORDER NOW' },
  flash_offer: { es: '🔥 OFERTA FLASH: Instala la App hoy y llévate una ración de PATATAS GRATIS en tu primer pedido', en: '🔥 FLASH OFFER: Install the App today and get FREE FRIES with your first order' },
  offer_ends: { es: '⏱️ LA OFERTA TERMINA EN:', en: '⏱️ OFFER ENDS IN:' },
  win_pizza: { es: '⚡ ¡GANA UNA PIZZA! Regístrate, compártelo con 5 amigos y tu próxima pizza te sale GRATIS (pedidos >15€)', en: '⚡ WIN A PIZZA! Register, share with 5 friends and your next pizza is FREE (orders >15€)' },

  // App Level
  splash_title: { es: 'Encendiendo motores...', en: 'Starting engines...' },
  splash_desc: { es: 'Preparando la mejor pizza', en: 'Preparing the best pizza' },
  closed_title: { es: 'Cerrado Temporalmente', en: 'Temporarily Closed' },
  closed_desc: { es: 'Lo sentimos mucho, pero en este momento no podemos aceptar nuevos pedidos por un cierre de emergencia o asuntos de fuerza mayor.', en: 'We are very sorry, but we cannot accept new orders at this time due to an emergency closure or force majeure.' },
  closed_btn: { es: 'Entendido, volveré más tarde', en: 'Understood, I will check back later' },

  // Dynamic Catalog UI
  our_ingredients_title: { es: 'NUESTROS INGREDIENTES', en: 'OUR INGREDIENTS' },
  our_ingredients_subtitle: { es: 'Carta oficial de toppings disponibles', en: 'Official list of available toppings' },
  ingredients_note: { es: 'Disponibles para pizzas al gusto y Mazzi Pizzas — pregunta disponibilidad de extras', en: 'Available for custom pizzas and Mazzi Pizzas — ask for extras availability' },
  varieties: { es: 'VARIEDADES', en: 'VARIETIES' },

  // Hero
  promo_title: { es: 'JUEVES LOCOS', en: 'CRAZY THURSDAYS' },
  promo_subtitle: { es: '2 PIZZAS X 11,00 €', en: '2 PIZZAS FOR 11.00 €' },
  promo_desc: { es: 'Cada jueves disfruta de dos pizzas de 33cm recién horneadas con hasta 3 ingredientes artesanos al mejor precio de la comarca.', en: 'Every Thursday enjoy two freshly baked 33cm pizzas with up to 3 artisan ingredients at the best price in town.' },
  promo_btn: { es: '¡Aprovechar Promo Jueves! →', en: 'Get Thursday Promo! →' },
  menu_btn: { es: 'Ver Menú Completo', en: 'View Full Menu' },

  // Cart & Checkout
  cart: { es: 'Carrito', en: 'Cart' },
  order_label: { es: 'Comanda', en: 'Order' },
  process_order: { es: 'Tramitar', en: 'Checkout' },
  empty_cart: { es: 'El carrito está vacío', en: 'Your cart is empty' },
  empty_cart_title: { es: 'Carrito Vacío', en: 'Empty Cart' },
  empty_cart_desc: { es: 'Tu estómago ruge... ¡Es hora de añadir algo delicioso!', en: 'Your stomach is rumbling... Time to add something delicious!' },
  your_order: { es: 'Tu Pedido', en: 'Your Order' },
  clear_cart_confirm: { es: '¿Estás seguro de que quieres vaciar todo tu pedido?', en: 'Are you sure you want to empty your cart?' },
  empty_cart_btn: { es: 'Vaciar carrito', en: 'Empty cart' },
  total: { es: 'Total', en: 'Total' },
  pay: { es: 'Pagar', en: 'Checkout' },
  delivery: { es: 'A domicilio', en: 'Delivery' },
  pickup: { es: 'Recogida en local', en: 'Pickup' },
  local: { es: 'Local / Mesa', en: 'Dine-in' },
  add_to_cart: { es: 'Añadir al carrito', en: 'Add to cart' },
  checkout_title: { es: 'Finalizar Pedido', en: 'Complete Order' },
  order_notes: { es: 'Notas del pedido', en: 'Order notes' },
  payment_method: { es: 'Método de Pago', en: 'Payment Method' },
  cash: { es: 'Efectivo', en: 'Cash' },
  card: { es: 'Tarjeta', en: 'Card' },

  // Admin & TPV
  admin_panel: { es: 'Panel de Administración', en: 'Admin Panel' },
  dashboard: { es: 'Resumen', en: 'Dashboard' },
  orders: { es: 'Pedidos', en: 'Orders' },
  kiosk: { es: 'TPV / Kiosco', en: 'POS / Kiosk' },
  analytics: { es: 'Analítica', en: 'Analytics' },
  settings: { es: 'Ajustes', en: 'Settings' },
  new_order: { es: 'Nuevo Pedido', en: 'New Order' },
  assign_client: { es: 'Asignar Cliente', en: 'Assign Client' },
  search_client: { es: 'Buscar cliente...', en: 'Search client...' },
  create_client: { es: 'Crear Cliente Nuevo', en: 'Create New Client' },

  // Filters
  all: { es: 'Todo', en: 'All' },
  pizzas: { es: 'Pizzas', en: 'Pizzas' },
  drinks: { es: 'Bebidas', en: 'Drinks' },
  desserts: { es: 'Postres', en: 'Desserts' },
};

const dynamicDictionary: Record<string, string> = {
  // Categories
  'PROMOCIONES': 'PROMOTIONS',
  'NUESTRAS PIZZAS': 'OUR PIZZAS',
  'PIZZAS BLANCAS': 'WHITE PIZZAS',
  'NUESTRAS PATATAS': 'OUR FRIES',
  'NUESTRAS BURGUERS': 'OUR BURGERS',
  'SECRET BURGUER': 'SECRET BURGER',
  'ALGO MÁS': 'SOMETHING ELSE',
  'BEBIDAS': 'DRINKS',
  'POR INGREDIENTES': 'CUSTOM PIZZAS',
  'POSTRES': 'DESSERTS',
  'SALSAS': 'SAUCES',
  
  // Ingredients / Products
  'ACEITUNAS NEGRAS': 'BLACK OLIVES',
  'CEBOLLA': 'ONION',
  'CHAMPIÑÓN': 'MUSHROOM',
  'PIMIENTO ROJO': 'RED PEPPER',
  'PIMIENTO VERDE': 'GREEN PEPPER',
  'MAÍZ': 'CORN',
  'ATÚN': 'TUNA',
  'GAMBAS': 'PRAWNS',
  'DELICIAS DE MAR': 'CRAB STICKS',
  'BACON': 'BACON',
  'CARNE KEBAB': 'KEBAB MEAT',
  'JAMÓN SERRANO': 'SERRANO HAM',
  'JAMÓN YORK': 'YORK HAM',
  'PEPERONI': 'PEPPERONI',
  'POLLO': 'CHICKEN',
  'SALAMI': 'SALAMI',
  'SALCHICHAS': 'SAUSAGES',
  'TERNERA': 'BEEF',
  'EXTRA MOZZARELLA': 'EXTRA MOZZARELLA',
  'ROQUEFORT': 'ROQUEFORT',
  'QUESO DE CABRA': 'GOAT CHEESE',
  'HUEVO': 'EGG',
  'PIÑA': 'PINEAPPLE',
  'ALLOLI GRATINADO': 'GRATIN AIOLI',
  'SALSA BARBACOA': 'BBQ SAUCE',
  'SALSA CHEDDAR': 'CHEDDAR SAUCE',
  'SALSA KEBAB': 'KEBAB SAUCE',
  'SALSA PICANTE': 'SPICY SAUCE',
  'SALSA CARBONARA': 'CARBONARA SAUCE',
  'SALSA BOLOÑESA': 'BOLOGNESE SAUCE',
  'POLLO AL CURRY': 'CURRY CHICKEN',
  'PULLED PORK': 'PULLED PORK',
  'DOBLE CHEDDAR': 'DOUBLE CHEDDAR',
  'HAMBURGUESA ARTESANA': 'ARTISAN BURGER',
  'CINCO QUESOS': 'FIVE CHEESES',
  'MOZZARELLA': 'MOZZARELLA',
  'TOMATE': 'TOMATO',
  'NATA': 'CREAM',
  'PATATAS GAJOS': 'POTATO WEDGES',
  'PIZZA MARGARITA': 'MARGHERITA PIZZA',
  'MAZZI PIZZA': 'MAZZI PIZZA',
  'PATATAS': 'FRIES',
  'NUEVO': 'NEW',
  'PICANTE': 'SPICY',
  'VEGANO': 'VEGAN',
  'VEGETARIANO': 'VEGETARIAN',
  'CERVEZAS': 'BEERS',
  'REFRESCOS': 'SOFT DRINKS',
  'AGUAS': 'WATER',
};

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  tDynamic: (text: string) => string;
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
      tDynamic: (text) => {
        if (!text) return text;
        const lang = get().lang;
        if (lang === 'es') return text;
        
        const upperText = text.toUpperCase();
        
        // Match exact first
        if (dynamicDictionary[upperText]) {
          const translated = dynamicDictionary[upperText];
          if (text === upperText) return translated;
          if (text[0] === text[0].toUpperCase()) {
            return translated.charAt(0) + translated.slice(1).toLowerCase();
          }
          return translated.toLowerCase();
        }
        
        // Text replacement for descriptions
        let translatedText = text;
        // Sort keys by length descending to replace longer phrases first
        const keys = Object.keys(dynamicDictionary).sort((a, b) => b.length - a.length);
        
        keys.forEach(esWord => {
          const regex = new RegExp(`(?<=\\b|\\s|^)(${esWord})(?=\\b|\\s|$)`, 'gi');
          translatedText = translatedText.replace(regex, (match) => {
            const enWord = dynamicDictionary[esWord];
            if (match === match.toUpperCase()) return enWord;
            if (match[0] === match[0].toUpperCase()) return enWord.charAt(0) + enWord.slice(1).toLowerCase();
            return enWord.toLowerCase();
          });
        });
        
        return translatedText;
      },
    }),
    {
      name: 'nestor-i18n-storage',
    }
  )
);
