import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from './cartStore';

export interface KioskClientInfo {
  id?: string; // UUID from Supabase profiles if registered
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  points?: number;
  is_registered?: boolean;
}

type DeliveryMethod = 'local' | 'pickup' | 'delivery';

interface KioskCartState {
  items: CartItem[];
  clientInfo?: KioskClientInfo;
  deliveryMethod: DeliveryMethod;
  lastUpdated: number;
  
  setClientInfo: (info?: KioskClientInfo) => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useKioskCartStore = create<KioskCartState>()(
  persist(
    (set, get) => ({
      items: [],
      clientInfo: undefined,
      deliveryMethod: 'local', // Por defecto para TPV es Local / Mesa
      lastUpdated: Date.now(),
      
      setClientInfo: (info) => set({ clientInfo: info, lastUpdated: Date.now() }),
      
      setDeliveryMethod: (method) => set({ deliveryMethod: method, lastUpdated: Date.now() }),
      
      addItem: (item) => set((state) => ({ 
        items: [...state.items, { ...item, id: crypto.randomUUID() }], 
        lastUpdated: Date.now() 
      })),
      
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
      
      clearCart: () => set({ 
        items: [], 
        clientInfo: undefined, 
        deliveryMethod: 'local',
        lastUpdated: Date.now() 
      }),
      
      getTotal: () => {
        const items = get().items;
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'nestor-kiosco-pos-cart', // Persistencia separada del carrito de clientes
    }
  )
);
