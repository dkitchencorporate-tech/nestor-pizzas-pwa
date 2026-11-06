import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useGuestOrderStore } from '../store/guestOrderStore';

type VerifyState = 'checking' | 'paid' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // ~30 segundos

export default function PaymentVerification() {
  const [state, setState] = useState<VerifyState>('checking');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const attemptsRef = useRef(0);
  const clearedRef = useRef(false);

  const checkoutReference = new URLSearchParams(window.location.search).get('ref');

  const checkStatus = async () => {
    if (!checkoutReference) {
      setState('failed');
      return;
    }

    try {
      // 1) Verificación activa síncrona en servidor contra SumUp + Supabase
      const res = await fetch('/api/sumup-verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutReference })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'paid' && data.orderId) {
          const method = data.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
          setOrderId(String(data.orderId));
          setDeliveryMethod(method);
          setState('paid');
          if (!clearedRef.current) {
            clearedRef.current = true;
            useCartStore.getState().clearCart();
            const { user, fetchOrders, fetchProfile } = useAuthStore.getState();
            if (user) {
              fetchOrders();
              fetchProfile(user.id);
            } else {
              useGuestOrderStore.getState().addGuestOrder({
                id: String(data.orderId),
                total_amount: data.amount || 0,
                status: 'pending',
                delivery_method: method,
                delivery_address: data.deliveryAddress || (method === 'pickup' ? 'Recogida en local (C. Alcalde Felip, 9 Caniles)' : ''),
                payment_method: 'online',
                created_at: new Date().toISOString(),
                client_name: data.clientName || '',
                order_items: (data.items || []).map((it: any) => ({
                  id: `${it.product_id}-${Date.now()}`,
                  quantity: it.quantity,
                  products: { name: it.name || 'Producto' },
                  customization_details: { name: it.name || 'Producto' }
                }))
              });
            }
          }
          return;
        }

        if (data.status === 'failed' || data.status === 'expired') {
          setState('failed');
          return;
        }
      } else {
        // Fallback a RPC de Supabase si el endpoint de Vercel tiene microcorte
        const { data: rpcData } = await supabase.rpc('sumup_get_checkout_status', {
          p_checkout_reference: checkoutReference
        });
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (row && row.status === 'paid' && row.order_id) {
          setOrderId(String(row.order_id));
          setState('paid');
          if (!clearedRef.current) {
            clearedRef.current = true;
            useCartStore.getState().clearCart();
            const { user, fetchOrders, fetchProfile } = useAuthStore.getState();
            if (user) {
              fetchOrders();
              fetchProfile(user.id);
            } else {
              useGuestOrderStore.getState().addGuestOrder({
                id: String(row.order_id),
                total_amount: 0,
                status: 'pending',
                delivery_method: 'delivery',
                payment_method: 'online',
                created_at: new Date().toISOString()
              });
            }
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error verificando pago:', err);
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
  const goOrder = () => { window.location.href = '/pedido'; };
  const retryCheck = () => { attemptsRef.current = 0; setState('checking'); checkStatus(); };

  return (
    <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center p-4">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl">
        {state === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="font-display font-black text-xl text-white uppercase mb-2">Verificando tu pago</h2>
            <p className="text-zinc-400 text-sm">Confirmando la operación de forma instantánea y segura. No cierres esta pantalla...</p>
          </>
        )}

        {state === 'paid' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="font-display font-black text-2xl text-white uppercase mb-2">¡Pago confirmado!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Tu pedido{orderId ? ` #${orderId.slice(0, 8)}` : ''} ya está recibido y en marcha hacia la cocina.
            </p>
            <button onClick={goOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-display font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all shadow-[0_10px_20px_rgba(22,163,74,0.3)] hover:scale-105">
              {deliveryMethod === 'pickup' ? 'Ver mi recogida en pizzería 🛍️' : 'Ver estado de mi pedido 🛵'}
            </button>
            <button onClick={goHome} className="w-full mt-3 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold py-3 rounded-2xl text-xs transition-all">
              Ir a la carta
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
            <p className="text-zinc-400 text-sm mb-6">Tu pago se ha procesado y nuestro sistema está finalizando el registro de cocina.</p>
            <button onClick={retryCheck} className="w-full bg-green-600 hover:bg-green-500 text-white font-display font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all mb-3">
              Comprobar de nuevo
            </button>
            <button onClick={goOrder} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-2xl uppercase tracking-wider text-xs transition-all">
              Ir al seguimiento de pedidos
            </button>
          </>
        )}
      </div>
    </div>
  );
}
