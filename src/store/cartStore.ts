import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  extras?: string[];
  size?: string;
}

interface CartState {
  items: CartItem[];
  kioskClientInfo?: { name: string; phone: string; email: string };
  setKioskClientInfo: (info?: { name: string; phone: string; email: string }) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  lastUpdated: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastUpdated: Date.now(),
      kioskClientInfo: undefined,
      setKioskClientInfo: (info) => set({ kioskClientInfo: info, lastUpdated: Date.now() }),
      addItem: (item) => set((state) => {
        // Simple logic for kiosks: we just add as a new line item to preserve specific notes/extras
        return { items: [...state.items, { ...item, id: crypto.randomUUID() }], lastUpdated: Date.now() };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        lastUpdated: Date.now()
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => 
          item.id === id ? { ...item, quantity } : item
        ),
        lastUpdated: Date.now()
      })),
      clearCart: () => set({ items: [], kioskClientInfo: undefined, lastUpdated: Date.now() }),
      getTotal: () => {
        const items = get().items;
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'nestor-kiosco-cart',
    }
  )
);
