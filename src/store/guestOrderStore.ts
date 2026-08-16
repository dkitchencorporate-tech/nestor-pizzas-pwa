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
          clearInterval(guestSubscription);
          guestSubscription = null;
        }
      },
      listenToGuestOrder: () => {
        const order = get().guestOrder;
        if (!order) return;
        
        // Polling every 5 seconds securely via RPC
        const intervalId = setInterval(async () => {
          const { data, error } = await supabase.rpc('get_guest_order_status', { p_order_id: order.id });
          
          if (!error && data) {
            const currentOrder = get().guestOrder;
            if (currentOrder && currentOrder.status !== data.status) {
              const updatedOrder = {
                ...currentOrder,
                status: data.status,
                estimated_ready_at: data.estimated_ready_at
              };
              
              set({ guestOrder: updatedOrder });
              
              // Emit events
              window.dispatchEvent(new CustomEvent('order-status-changed', { detail: updatedOrder }));
              if (data.status === 'delivered') {
                window.dispatchEvent(new CustomEvent('order-delivered', { detail: updatedOrder }));
              }
            }
          }
        }, 5000);

        guestSubscription = intervalId;
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
