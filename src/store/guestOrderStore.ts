import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface GuestOrderState {
  guestOrder: any | null;
  setGuestOrder: (order: any) => void;
  clearGuestOrder: () => void;
  listenToGuestOrder: () => void;
}

let guestSubscription: any = null;

export const useGuestOrderStore = create<GuestOrderState>()(
  persist(
    (set, get) => ({
      guestOrder: null,
      setGuestOrder: (order) => {
        set({ guestOrder: order });
        get().listenToGuestOrder();
      },
      clearGuestOrder: () => {
        set({ guestOrder: null });
        if (guestSubscription) {
          supabase.removeChannel(guestSubscription);
          guestSubscription = null;
        }
      },
      listenToGuestOrder: () => {
        const order = get().guestOrder;
        if (!order) return;
        
        if (guestSubscription) {
          supabase.removeChannel(guestSubscription);
        }

        guestSubscription = supabase.channel(`public:guest_order:${order.id}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders',
            filter: `id=eq.${order.id}`
          }, (payload) => {
            set({ guestOrder: payload.new });
            
            // Emit events
            window.dispatchEvent(new CustomEvent('order-status-changed', { detail: payload.new }));
            if (payload.new.status === 'delivered') {
              window.dispatchEvent(new CustomEvent('order-delivered', { detail: payload.new }));
            }
          })
          .subscribe();
      }
    }),
    {
      name: 'guest-order-storage',
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, si hay una orden de invitado activa, reactivar el listener
        if (state?.guestOrder) {
          setTimeout(() => state.listenToGuestOrder(), 1000);
        }
      }
    }
  )
);
