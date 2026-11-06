import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface SettingsState {
  deliveryFee: number;
  minOrderDelivery: number;
  juevesPromoFee: number;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: { minOrderDelivery?: number; deliveryFee?: number }) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  deliveryFee: 1.00,
  minOrderDelivery: 10.00,
  juevesPromoFee: 1.00,

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (!error && data) {
        set({
          deliveryFee: Number(data.delivery_fee),
          minOrderDelivery: Number(data.min_order_delivery),
          juevesPromoFee: Number(data.jueves_promo_fee)
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  },

  updateSettings: async (newSettings: { minOrderDelivery?: number; deliveryFee?: number }) => {
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
          delivery_fee: newSettings.deliveryFee
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar ajustes');
      }

      const { settings } = await res.json();
      set({
        deliveryFee: Number(settings.delivery_fee),
        minOrderDelivery: Number(settings.min_order_delivery),
        juevesPromoFee: Number(settings.jueves_promo_fee)
      });
      return true;
    } catch (e) {
      console.error('Error updating settings:', e);
      throw e;
    }
  }
}));
