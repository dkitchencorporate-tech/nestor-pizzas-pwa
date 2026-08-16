import { useState, useEffect, lazy, Suspense } from 'react';
import CartDrawer from './components/CartDrawer';
import CartBar from './components/CartBar';
import UpsellModal from './components/UpsellModal';
import CheckoutModal from './components/CheckoutModal';
import UserModal from './components/UserModal';
import NotificationManager from './components/NotificationManager';
import { useCartStore } from './store/cartStore';
import { useAuthStore } from './store/authStore';
import { useGuestOrderStore } from './store/guestOrderStore';
import ReviewModal from './components/ReviewModal';
import GuestRegistrationModal from './components/GuestRegistrationModal';
import { useI18nStore } from './store/i18nStore';

const Catalog = lazy(() => import('./features/catalog/Catalog'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));

import { supabase } from './lib/supabase';

function App() {
  const { t } = useI18nStore();
  const [currentView, setCurrentView] = useState<'splash' | 'catalog' | 'admin' | 'tracking'>('splash');
  const [isPreloaderFading, setIsPreloaderFading] = useState(false);
  const [isStoreClosed, setIsStoreClosed] = useState(false);
  
  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [isGuestRegistrationOpen, setIsGuestRegistrationOpen] = useState(false);
  const [guestOrderForRegistration, setGuestOrderForRegistration] = useState<any>(null);
  
  const cartItemsCount = useCartStore(state => state.items.length);
  const { orders, user } = useAuthStore();
  const guestOrder = useGuestOrderStore(state => state.guestOrder);
  
  const hasActiveOrder = user 
    ? (orders || []).some(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status))
    : (guestOrder && ['pending', 'cooking', 'delivering', 'ready'].includes(guestOrder.status));

  // Check if URL is /admin on load
  if (currentView === 'splash' && window.location.pathname.startsWith('/admin')) {
    setCurrentView('admin');
  }

  useEffect(() => {
    if (currentView === 'splash' && window.location.pathname !== '/admin') {
      const timer = setTimeout(() => {
        setIsPreloaderFading(true);
        setTimeout(() => {
          setCurrentView('catalog');
        }, 700); // Wait for fade out animation (700ms)
      }, 1500); // Show preloader for 1.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  useEffect(() => {
    const handleOpenTracking = () => setCurrentView('tracking');
    const handleOrderDelivered = (e: any) => {
      setReviewOrder(e.detail);
      setIsReviewOpen(true);
    };
    
    window.addEventListener('open-tracking', handleOpenTracking);
    window.addEventListener('order-delivered', handleOrderDelivered as EventListener);
    
    // Fetch Store Status
    const fetchStoreStatus = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'store_closed').single();
      if (data && data.value === 'true') {
        setIsStoreClosed(true);
      }
    };
    fetchStoreStatus();

    // Listen to Store Status changes
    const settingsChannel = supabase.channel('public:app_settings_global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: "key=eq.store_closed" }, payload => {
        const newValue = payload.new as any;
        setIsStoreClosed(newValue.value === 'true');
      })
      .subscribe();
      
    return () => {
      window.removeEventListener('open-tracking', handleOpenTracking);
      window.removeEventListener('order-delivered', handleOrderDelivered as EventListener);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // Cart Auto-Clear (15 minutes inactivity)
  useEffect(() => {
    const checkCartTimeout = () => {
      const state = useCartStore.getState();
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      if (state.items.length > 0 && Date.now() - state.lastUpdated > FIFTEEN_MINUTES) {
        state.clearCart();
      }
    };
    checkCartTimeout();
    const interval = setInterval(checkCartTimeout, 60000);
    return () => clearInterval(interval);
  }, []);

  if (currentView === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center text-green-500 font-display font-bold">Cargando Administración...</div>}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <div className="selection:bg-nestor-green selection:text-white">
      <NotificationManager />
      {/* Preloader exacto original */}
      {currentView === 'splash' && (
        <div className={`fixed inset-0 z-[999] bg-[#0A0A0E] flex flex-col items-center justify-center transition-opacity duration-700 ${isPreloaderFading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="relative flex items-center justify-center">
            {/* Spinner / Engine animation */}
            <div className="absolute inset-0 rounded-full border-t-4 border-l-2 border-green-500 animate-[spin_1s_linear_infinite] w-32 h-32 -m-4"></div>
            <div className="absolute inset-0 rounded-full border-b-4 border-r-2 border-green-500/50 animate-[spin_1.5s_linear_infinite_reverse] w-36 h-36 -m-6"></div>
            
            {/* Logo inside */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-black rounded-full border-2 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.3)] z-10 overflow-hidden flex items-center justify-center">
              <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas" className="w-[120%] h-[120%] object-cover mix-blend-screen max-w-none" />
            </div>
          </div>
          <div className="mt-12 text-center animate-pulse">
            <h2 className="text-green-500 font-display font-black text-2xl tracking-widest uppercase">{t('splash_title')}</h2>
            <p className="text-gray-400 text-sm font-medium mt-2">{t('splash_desc')}</p>
          </div>
        </div>
      )}

      {/* Main Catalog View */}
      {currentView === 'catalog' && (
        <>
          <Suspense fallback={<div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center text-green-500 font-display font-bold">Cargando Catálogo...</div>}>
            <Catalog />
          </Suspense>

          {/* Store Closed Modal */}
          {isStoreClosed && (
            <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 bg-red-600/20 border-2 border-red-500 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                <span className="text-5xl">🔒</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-wider mb-4">
                {t('closed_title')}
              </h2>
              <p className="text-zinc-400 max-w-md mx-auto text-sm sm:text-base leading-relaxed mb-8">
                {t('closed_desc')}
              </p>
              <button 
                onClick={() => setIsStoreClosed(false)}
                className="bg-white hover:bg-gray-100 text-black font-display font-bold px-8 py-4 rounded-xl transition-all hover:scale-105"
              >
                {t('closed_btn')}
              </button>
            </div>
          )}

          {/* Floating Cart Bar */}
          <CartBar onOpenUpsell={() => setIsUpsellOpen(true)} />

          {/* Cart Flow Modals */}
          {/* We keep CartDrawer if needed from elsewhere, but CartBar replaces the trigger */}
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
            onCheckout={() => {
              setIsCartOpen(false);
              setIsUpsellOpen(true);
            }} 
          />

          {isUpsellOpen && (
            <UpsellModal 
              onClose={() => setIsUpsellOpen(false)}
              onProceedToCheckout={() => {
                setIsUpsellOpen(false);
                setIsCheckoutOpen(true);
              }}
            />
          )}

          {isCheckoutOpen && (
            <CheckoutModal 
              onClose={() => setIsCheckoutOpen(false)}
              onSuccess={(orderData, isGuest) => {
                setIsCheckoutOpen(false);
                if (isGuest) {
                  setGuestOrderForRegistration(orderData);
                  setIsGuestRegistrationOpen(true);
                } else {
                  useCartStore.getState().clearCart();
                  setCurrentView('tracking');
                }
              }}
            />
          )}
          
          <UserModal />
        </>
      )}

      {currentView === 'tracking' && (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center text-green-500 font-display font-bold">Cargando Seguimiento...</div>}>
          <OrderTracking onBack={() => setCurrentView('catalog')} />
        </Suspense>
      )}

      {hasActiveOrder && currentView !== 'tracking' && currentView !== 'admin' && (
        <button
          onClick={() => setCurrentView('tracking')}
          className="fixed bottom-24 right-4 sm:right-6 z-[900] w-14 h-14 sm:w-16 sm:h-16 bg-green-500 text-white rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] flex items-center justify-center animate-bounce transition-transform hover:scale-110"
        >
          <span className="text-2xl sm:text-3xl">🛵</span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
          </span>
        </button>
      )}

      <ReviewModal 
        isOpen={isReviewOpen} 
        onClose={() => setIsReviewOpen(false)} 
        order={reviewOrder} 
      />

      <GuestRegistrationModal
        isOpen={isGuestRegistrationOpen}
        order={guestOrderForRegistration}
        onSkip={() => {
          setIsGuestRegistrationOpen(false);
          useCartStore.getState().clearCart();
          setCurrentView('tracking');
        }}
        onSuccess={() => {
          setIsGuestRegistrationOpen(false);
          useCartStore.getState().clearCart();
          setCurrentView('tracking');
        }}
      />
    </div>
  );
}

export default App;
