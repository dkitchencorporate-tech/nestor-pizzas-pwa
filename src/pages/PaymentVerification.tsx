import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useGuestOrderStore } from '../store/guestOrderStore';

type VerifyState = 'checking' | 'paid' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 24; // ~60 segundos

export default function PaymentVerification() {
  const [state, setState] = useState<VerifyState>('checking');
  const [orderId, setOrderId] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const clearedRef = useRef(false);

  const checkoutReference = new URLSearchParams(window.location.search).get('ref');

  const checkStatus = async () => {
    if (!checkoutReference) {
      setState('failed');
      return;
    }

    const { data, error } = await supabase.rpc('sumup_get_checkout_status', {
      p_checkout_reference: checkoutReference
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (error || !row) {
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) setState('timeout');
      return;
    }

    if (row.status === 'paid') {
      setOrderId(row.order_id ? String(row.order_id) : null);
      setState('paid');
      if (!clearedRef.current) {
        clearedRef.current = true;
        useCartStore.getState().clearCart();
        const { user, fetchOrders, fetchProfile } = useAuthStore.getState();
        if (user) {
          fetchOrders();
          fetchProfile(user.id);
        } else if (row.order_id) {
          useGuestOrderStore.getState().addGuestOrder({
            id: String(row.order_id),
            total_amount: 0,
            status: 'pending',
            delivery_method: 'delivery'
          });
        }
      }
      return;
    }

    if (row.status === 'failed' || row.status === 'expired') {
      setState('failed');
      return;
    }

    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setState('timeout');
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      setState(current => {
        if (current === 'checking') checkStatus();
        return current;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = () => { window.location.href = '/'; };
  const retryCheck = () => { attemptsRef.current = 0; setState('checking'); checkStatus(); };

  return (
    <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center p-4">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl">
        {state === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="font-display font-black text-xl text-white uppercase mb-2">Verificando tu pago</h2>
            <p className="text-zinc-400 text-sm">Estamos confirmando el pago con la pasarela de forma segura. No cierres esta pantalla.</p>
          </>
        )}

        {state === 'paid' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="font-display font-black text-2xl text-white uppercase mb-2">¡Pago confirmado!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Tu pedido{orderId ? ` #${orderId}` : ''} ya está en camino a cocina.
            </p>
            <button onClick={goHome} className="w-full bg-green-600 hover:bg-green-500 text-white font-display font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all">
              Ver mi pedido
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <span className="text-4xl">✕</span>
            </div>
            <h2 className="font-display font-black text-xl text-white uppercase mb-2">El pago no se completó</h2>
            <p className="text-zinc-400 text-sm mb-6">No te hemos cobrado nada. Tu carrito sigue intacto, puedes volver a intentarlo.</p>
            <button onClick={goHome} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-display font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all">
              Volver al pedido
            </button>
          </>
        )}

        {state === 'timeout' && (
          <>
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <h2 className="font-display font-black text-xl text-white uppercase mb-2">Sigue en proceso</h2>
            <p className="text-zinc-400 text-sm mb-6">Tu pago está confirmándose, puede tardar unos segundos más de lo normal. No te preocupes si ya pagaste — tu pedido llegará igual.</p>
            <button onClick={retryCheck} className="w-full bg-green-600 hover:bg-green-500 text-white font-display font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all mb-3">
              Comprobar de nuevo
            </button>
            <button onClick={goHome} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-2xl uppercase tracking-wider text-xs transition-all">
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
