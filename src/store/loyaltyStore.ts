import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  min_order: number;
  target_type: 'pizzas_sugerencia' | 'product';
  product_id: number | null;
  product_name: string;
  active: boolean;
}

export interface LoyaltyConfig {
  enabled: boolean;
  points_per_10_eur: number;
  min_order_to_redeem: number;
  rewards: LoyaltyReward[];
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  points_per_10_eur: 2,
  min_order_to_redeem: 15,
  rewards: [
    {
      id: 'vip-pizza-sugerencia',
      title: 'Pizza Sugerencia Gratis',
      description: 'Canjea 20 puntos por cualquier Pizza Sugerencia (Nuestras Pizzas o Pizzas Blancas, tamaño normal) en pedidos desde 15,00 €.',
      points_cost: 20,
      min_order: 15,
      target_type: 'pizzas_sugerencia',
      product_id: null,
      product_name: 'Cualquier Pizza Sugerencia',
      active: true,
    },
  ],
};

interface LoyaltyState {
  config: LoyaltyConfig;
  isLoaded: boolean;
  isSaving: boolean;
  fetchLoyaltyConfig: () => Promise<void>;
  updateLoyaltyConfig: (newConfig: LoyaltyConfig) => Promise<void>;
}

let realtimeSubscribed = false;

export const useLoyaltyStore = create<LoyaltyState>((set) => ({
  config: DEFAULT_LOYALTY_CONFIG,
  isLoaded: false,
  isSaving: false,

  fetchLoyaltyConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'loyalty_config')
        .maybeSingle();

      if (!error && data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        set({
          config: {
            enabled: parsed.enabled !== false,
            points_per_10_eur: Number.isFinite(Number(parsed.points_per_10_eur)) ? Number(parsed.points_per_10_eur) : 2,
            min_order_to_redeem: Number.isFinite(Number(parsed.min_order_to_redeem)) ? Number(parsed.min_order_to_redeem) : 15,
            rewards: Array.isArray(parsed.rewards) && parsed.rewards.length > 0 ? parsed.rewards : DEFAULT_LOYALTY_CONFIG.rewards,
          },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }

      if (!realtimeSubscribed) {
        realtimeSubscribed = true;
        supabase
          .channel('realtime_loyalty_config')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.loyalty_config' },
            (payload: any) => {
              const rawVal = payload?.new?.value;
              if (!rawVal) return;
              try {
                const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                set({
                  config: {
                    enabled: parsed.enabled !== false,
                    points_per_10_eur: Number.isFinite(Number(parsed.points_per_10_eur)) ? Number(parsed.points_per_10_eur) : 2,
                    min_order_to_redeem: Number.isFinite(Number(parsed.min_order_to_redeem)) ? Number(parsed.min_order_to_redeem) : 15,
                    rewards: Array.isArray(parsed.rewards) && parsed.rewards.length > 0 ? parsed.rewards : DEFAULT_LOYALTY_CONFIG.rewards,
                  },
                });
              } catch {
                // ignore malformed json
              }
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Error cargando loyalty_config:', e);
      set({ isLoaded: true });
    }
  },

  updateLoyaltyConfig: async (newConfig: LoyaltyConfig) => {
    set({ isSaving: true });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        const res = await fetch('/api/update-loyalty-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newConfig),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'No se pudo guardar la configuración de fidelización');
        }
        const saved = await res.json();
        if (saved?.config) {
          set({ config: saved.config, isSaving: false });
          return;
        }
      }

      // Fallback directo si la sesión de Supabase tiene rol admin por RLS
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'loyalty_config', value: JSON.stringify(newConfig) }, { onConflict: 'key' });
      if (error) throw error;
      set({ config: newConfig, isSaving: false });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },
}));

/**
 * Identifica si un pedido tiene un canje de puntos VIP y cuál fue exactamente
 * el producto canjeado (tanto por flag explícito `is_vip_reward` como por coincidencia de importe).
 */
export function getOrderVipRedemptionInfo(order: any): {
  hasVipRedemption: boolean;
  pointsRedeemed: number;
  discountApplied: number;
  redeemedItemId: any;
  redeemedProductName: string;
} {
  const discountApplied = Number(order?.discount_applied || 0);
  const pointsRedeemed = Number(order?.points_redeemed || (discountApplied > 0 ? 20 : 0));
  const items: any[] = Array.isArray(order?.order_items) ? order.order_items : [];

  if (discountApplied <= 0 && pointsRedeemed <= 0) {
    return {
      hasVipRedemption: false,
      pointsRedeemed: 0,
      discountApplied: 0,
      redeemedItemId: null,
      redeemedProductName: '',
    };
  }

  // 1. Buscar artículo etiquetado explícitamente con `is_vip_reward: true` o `redeem_target: true`
  let targetItem = items.find(
    (it) =>
      it?.customization_details?.is_vip_reward === true ||
      it?.customization_details?.redeem_target === true ||
      it?.redeem_target === true
  );

  // 2. Fallback para pedidos históricos: buscar artículo cuyo unit_price coincida con discount_applied
  if (!targetItem && discountApplied > 0) {
    targetItem = items.find((it) => Math.abs(Number(it?.unit_price || 0) - discountApplied) < 0.05);
  }

  // 3. Segundo fallback: primera pizza del pedido
  if (!targetItem && items.length > 0) {
    targetItem =
      items.find((it) => {
        const name = (it?.customization_details?.name || it?.products?.name || '').toLowerCase();
        return name.includes('pizza') || name.includes('base blanca') || name.includes('lionesa') || name.includes('carbonara');
      }) || items[0];
  }

  const rawName = targetItem?.customization_details?.name || targetItem?.products?.name || 'Producto Club VIP';

  return {
    hasVipRedemption: true,
    pointsRedeemed: pointsRedeemed > 0 ? pointsRedeemed : 20,
    discountApplied,
    redeemedItemId: targetItem?.id ?? null,
    redeemedProductName: rawName,
  };
}
