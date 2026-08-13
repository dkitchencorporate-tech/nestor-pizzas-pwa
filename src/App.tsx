import { useState, useEffect } from 'react';
import Catalog from './features/catalog/Catalog';
import AdminDashboard from './pages/AdminDashboard';
import CartDrawer from './components/CartDrawer';
import CartBar from './components/CartBar';
import UpsellModal from './components/UpsellModal';
import CheckoutModal from './components/CheckoutModal';
import UserModal from './components/UserModal';
import LiveOrderTracker from './components/LiveOrderTracker';
import { useCartStore } from './store/cartStore';

function App() {
  const [currentView, setCurrentView] = useState<'splash' | 'catalog' | 'admin'>('splash');
  const [isPreloaderFading, setIsPreloaderFading] = useState(false);
  
  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const cartItemsCount = useCartStore(state => state.items.length);

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

  if (currentView === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="selection:bg-nestor-green selection:text-white">
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
            <h2 className="text-green-500 font-display font-black text-2xl tracking-widest uppercase">Encendiendo motores...</h2>
            <p className="text-gray-400 text-sm font-medium mt-2">Preparando la mejor pizza</p>
          </div>
        </div>
      )}

      {/* Main Catalog View */}
      {currentView === 'catalog' && (
        <>
          <Catalog />

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
              onSuccess={() => {
                // Return to splash after successful payment
                useCartStore.getState().clearCart();
                setIsCheckoutOpen(false);
                setCurrentView('splash');
              }}
            />
          )}
          
          <UserModal />
          
          <LiveOrderTracker />
        </>
      )}
    </div>
  );
}

export default App;
