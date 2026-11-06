import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface StorePolicies {
  allowDelivery: boolean;
  deliveryAllowCard: boolean;
  deliveryAllowCash: boolean;
  allowPickup: boolean;
  pickupAllowCard: boolean;
  pickupAllowCash: boolean;
}

interface SettingsState extends StorePolicies {
  deliveryFee: number;
  minOrderDelivery: number;
  juevesPromoFee: number;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: {
    minOrderDelivery?: number;
    deliveryFee?: number;
    allowDelivery?: boolean;
    deliveryAllowCard?: boolean;
    deliveryAllowCash?: boolean;
    allowPickup?: boolean;
    pickupAllowCard?: boolean;
    pickupAllowCash?: boolean;
  }) => Promise<boolean>;
  applyRealtimePolicy: (key: string, value: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  deliveryFee: 1.00,
  minOrderDelivery: 10.00,
  juevesPromoFee: 1.00,

  // Valores iniciales (según decisión de Néstor: recogidas pausadas, solo domicilio con tarjeta)
  allowDelivery: true,
  deliveryAllowCard: true,
  deliveryAllowCash: false,
  allowPickup: false,
  pickupAllowCard: true,
  pickupAllowCash: false,

  fetchSettings: async () => {
    try {
      // 1) Leer importes de store_settings
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      // 2) Leer políticas dinámicas de app_settings
      const { data: appData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'allow_delivery',
          'delivery_allow_card',
          'delivery_allow_cash',
          'allow_pickup',
          'pickup_allow_card',
          'pickup_allow_cash'
        ]);

      const policies: Partial<StorePolicies> = {};
      if (appData) {
        appData.forEach(item => {
          if (item.key === 'allow_delivery') policies.allowDelivery = item.value === 'true';
          if (item.key === 'delivery_allow_card') policies.deliveryAllowCard = item.value === 'true';
          if (item.key === 'delivery_allow_cash') policies.deliveryAllowCash = item.value === 'true';
          if (item.key === 'allow_pickup') policies.allowPickup = item.value === 'true';
          if (item.key === 'pickup_allow_card') policies.pickupAllowCard = item.value === 'true';
          if (item.key === 'pickup_allow_cash') policies.pickupAllowCash = item.value === 'true';
        });
      }

      set({
        ...(storeData ? {
          deliveryFee: Number(storeData.delivery_fee),
          minOrderDelivery: Number(storeData.min_order_delivery),
          juevesPromoFee: Number(storeData.jueves_promo_fee)
        } : {}),
        ...policies
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  },

  applyRealtimePolicy: (key: string, value: string) => {
    const isTrue = value === 'true';
    if (key === 'allow_delivery') set({ allowDelivery: isTrue });
    if (key === 'delivery_allow_card') set({ deliveryAllowCard: isTrue });
    if (key === 'delivery_allow_cash') set({ deliveryAllowCash: isTrue });
    if (key === 'allow_pickup') set({ allowPickup: isTrue });
    if (key === 'pickup_allow_card') set({ pickupAllowCard: isTrue });
    if (key === 'pickup_allow_cash') set({ pickupAllowCash: isTrue });
    if (key === 'min_order_delivery') {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) set({ minOrderDelivery: num });
    }
    if (key === 'delivery_fee') {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) set({ deliveryFee: num });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesión requerida');

      const res = await fetch('/api/update-store-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          min_order_delivery: newSettings.minOrderDelivery,
          delivery_fee: newSettings.deliveryFee,
          allow_delivery: newSettings.allowDelivery,
          delivery_allow_card: newSettings.deliveryAllowCard,
          delivery_allow_cash: newSettings.deliveryAllowCash,
          allow_pickup: newSettings.allowPickup,
          pickup_allow_card: newSettings.pickupAllowCard,
          pickup_allow_cash: newSettings.pickupAllowCash
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar ajustes');
      }

      // Actualizar estado local inmediatamente
      set({
        ...(newSettings.minOrderDelivery !== undefined ? { minOrderDelivery: newSettings.minOrderDelivery } : {}),
        ...(newSettings.deliveryFee !== undefined ? { deliveryFee: newSettings.deliveryFee } : {}),
        ...(newSettings.allowDelivery !== undefined ? { allowDelivery: newSettings.allowDelivery } : {}),
        ...(newSettings.deliveryAllowCard !== undefined ? { deliveryAllowCard: newSettings.deliveryAllowCard } : {}),
        ...(newSettings.deliveryAllowCash !== undefined ? { deliveryAllowCash: newSettings.deliveryAllowCash } : {}),
        ...(newSettings.allowPickup !== undefined ? { allowPickup: newSettings.allowPickup } : {}),
        ...(newSettings.pickupAllowCard !== undefined ? { pickupAllowCard: newSettings.pickupAllowCard } : {}),
        ...(newSettings.pickupAllowCash !== undefined ? { pickupAllowCash: newSettings.pickupAllowCash } : {})
      });

      return true;
    } catch (e) {
      console.error('Error updating settings:', e);
      throw e;
    }
  }
}));
