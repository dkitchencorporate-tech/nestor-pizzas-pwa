import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface SettingsState {
  deliveryFee: number;
  minOrderDelivery: number;
  juevesPromoFee: number;
  fetchSettings: () => Promise<void>;
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
          deliveryFee: data.delivery_fee,
          minOrderDelivery: data.min_order_delivery,
          juevesPromoFee: data.jueves_promo_fee
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }
}));
