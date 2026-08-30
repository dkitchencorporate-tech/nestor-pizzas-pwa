import { generateSafeUUID } from '../utils/uuid';
import { create } from 'zustand';
import { CartItem } from './cartStore';

export interface KioskClientInfo {
  id?: string;
  full_name: string;
  phone: string;
  address?: string;
  is_registered: boolean;
}

export type DeliveryMethod = 'local' | 'pickup' | 'delivery';

interface KioskCartState {
  items: CartItem[];
  clientInfo?: KioskClientInfo;
  deliveryMethod: DeliveryMethod;
  lastUpdated: number;
  setClientInfo: (info: KioskClientInfo | undefined) => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updatePrice: (id: string, price: number) => void;
  clearCart: () => void;
  resetKiosk: () => void;
  getTotal: () => number;
}

export const useKioskCartStore = create<KioskCartState>()((set, get) => ({
  items: [],
  clientInfo: undefined,
  deliveryMethod: 'local',
  lastUpdated: Date.now(),
  
  setClientInfo: (info) => set({ clientInfo: info }),
  setDeliveryMethod: (method) => set({ deliveryMethod: method }),
  
  addItem: (item) => set((state) => {
    const existingItemIndex = state.items.findIndex(
      i => i.productId === item.productId && 
           i.notes === item.notes &&
           JSON.stringify(i.extras) === JSON.stringify(item.extras)
    );

    if (existingItemIndex > -1) {
      const newItems = [...state.items];
      newItems[existingItemIndex].quantity += item.quantity;
      return { items: newItems, lastUpdated: Date.now() };
    }

    return { 
      items: [...state.items, { ...item, id: generateSafeUUID() }],
      lastUpdated: Date.now()
    };
  }),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id),
    lastUpdated: Date.now()
  })),
  
  updateQuantity: (id, quantity) => set((state) => ({
    items: state.items.map((item) => 
      item.id === id ? { ...item, quantity } : item
    ),
    lastUpdated: Date.now()
  })),

  updatePrice: (id, price) => set((state) => ({
    items: state.items.map((item) => 
      item.id === id ? { ...item, price } : item
    ),
    lastUpdated: Date.now()
  })),
  
  clearCart: () => set({ 
    items: [],
    clientInfo: undefined,
    lastUpdated: Date.now()
  }),
  
  resetKiosk: () => set({
    items: [],
    clientInfo: undefined,
    deliveryMethod: 'local',
    lastUpdated: Date.now()
  }),
  
  getTotal: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
}));
