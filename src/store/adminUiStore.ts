import { create } from 'zustand';

export type AdminTab = 'orders' | 'history' | 'kiosk' | 'catalog' | 'analytics' | 'printers' | 'pwa';

interface AdminUiState {
  activeTab: AdminTab;
  editingOrder: any | null; // El pedido que se está editando
  
  setActiveTab: (tab: AdminTab) => void;
  setEditingOrder: (order: any | null) => void;
  startEditingOrder: (order: any) => void;
  finishEditingOrder: () => void;
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  activeTab: 'orders',
  editingOrder: null,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setEditingOrder: (order) => set({ editingOrder: order }),
  
  startEditingOrder: (order) => {
    set({ editingOrder: order, activeTab: 'kiosk' });
  },
  
  finishEditingOrder: () => {
    set({ editingOrder: null, activeTab: 'orders' });
  }
}));
