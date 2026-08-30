import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export interface GuestOrder {
  id: string;
  total_amount: number;
  status: string;
  delivery_method: string;
  estimated_ready_at?: string;
  created_at?: string;
  client_name?: string;
  order_items?: any[];
  [key: string]: any;
}

interface GuestOrderState {
  guestOrders: GuestOrder[];
  guestOrder: GuestOrder | null;
  addGuestOrder: (order: GuestOrder) => void;
  setGuestOrder: (order: GuestOrder) => void;
  clearGuestOrder: () => void;
  clearGuestOrders: () => void;
  listenToGuestOrders: () => void;
  listenToGuestOrder: () => void;
}

let guestPollInterval: any = null;

export const useGuestOrderStore = create<GuestOrderState>()(
  persist(
    (set, get) => ({
      guestOrders: [],
      guestOrder: null,

      addGuestOrder: (order) => {
        if (!order || !order.id) return;
        const currentOrders = get().guestOrders || [];
        const existingIndex = currentOrders.findIndex(o => o.id === order.id);
        
        let updatedOrders: GuestOrder[];
        if (existingIndex >= 0) {
          updatedOrders = [...currentOrders];
          updatedOrders[existingIndex] = { ...updatedOrders[existingIndex], ...order };
        } else {
          updatedOrders = [order, ...currentOrders];
        }

        const primaryActive = updatedOrders.find(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status)) || updatedOrders[0] || null;

        set({
          guestOrders: updatedOrders,
          guestOrder: primaryActive
        });

        get().listenToGuestOrders();
      },

      setGuestOrder: (order) => {
        get().addGuestOrder(order);
      },

      clearGuestOrder: () => {
        set({ guestOrder: null, guestOrders: [] });
        if (guestPollInterval) {
          clearInterval(guestPollInterval);
          guestPollInterval = null;
        }
      },

      clearGuestOrders: () => {
        get().clearGuestOrder();
      },

      listenToGuestOrders: () => {
        if (guestPollInterval) {
          clearInterval(guestPollInterval);
          guestPollInterval = null;
        }

        const pollActiveOrders = async () => {
          const orders = get().guestOrders || [];
          const activeOrders = orders.filter(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status));
          
          if (activeOrders.length === 0) {
            if (guestPollInterval) {
              clearInterval(guestPollInterval);
              guestPollInterval = null;
            }
            return;
          }

          for (const order of activeOrders) {
            try {
              const { data, error } = await supabase.rpc('get_guest_order_status', { p_order_id: order.id });
              if (!error && data && data.status) {
                const currentOrders = get().guestOrders || [];
                const targetOrder = currentOrders.find(o => o.id === order.id);
                
                if (targetOrder && targetOrder.status !== data.status) {
                  const updated = {
                    ...targetOrder,
                    status: data.status,
                    estimated_ready_at: data.estimated_ready_at || targetOrder.estimated_ready_at
                  };

                  const updatedList = currentOrders.map(o => o.id === order.id ? updated : o);
                  const primaryActive = updatedList.find(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status)) || updatedList[0] || null;

                  set({
                    guestOrders: updatedList,
                    guestOrder: primaryActive
                  });

                  window.dispatchEvent(new CustomEvent('order-status-changed', { detail: updated }));
                  if (data.status === 'delivered') {
                    window.dispatchEvent(new CustomEvent('order-delivered', { detail: updated }));
                  }
                }
              }
            } catch (e) {
              console.warn('Error polling guest order:', order.id, e);
            }
          }
        };

        pollActiveOrders();
        guestPollInterval = setInterval(pollActiveOrders, 5000);
      },

      listenToGuestOrder: () => {
        get().listenToGuestOrders();
      }
    }),
    {
      name: 'guest-order-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.guestOrder && (!state.guestOrders || state.guestOrders.length === 0)) {
            state.guestOrders = [state.guestOrder];
          }
          if (state.guestOrders && state.guestOrders.some(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status))) {
            setTimeout(() => state.listenToGuestOrders(), 1000);
          }
        }
      }
    }
  )
);
