import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface DayHours {
  open: string;
  close: string;
}

// Fallback idéntico al horario hardcodeado original (src/utils/timeUtils.ts),
// usado solo hasta que la primera consulta a `store_hours` responda o si la tabla no existe aún.
export const DEFAULT_STORE_HOURS: Record<number, DayHours | null> = {
  0: { open: '20:00', close: '23:30' }, // Domingo
  1: null, // Lunes Cerrado
  2: null, // Martes Cerrado
  3: { open: '20:30', close: '23:30' }, // Miércoles
  4: { open: '20:00', close: '23:30' }, // Jueves
  5: { open: '20:00', close: '23:59' }, // Viernes
  6: { open: '20:00', close: '23:59' }, // Sábado
};

interface StoreHoursState {
  hours: Record<number, DayHours | null>;
  fetchHours: () => Promise<void>;
}

export const useStoreHoursStore = create<StoreHoursState>((set) => ({
  hours: DEFAULT_STORE_HOURS,

  fetchHours: async () => {
    const { data, error } = await supabase.from('store_hours').select('*');
    if (error || !data || data.length === 0) return;

    const mapped: Record<number, DayHours | null> = {};
    data.forEach((row: any) => {
      mapped[row.day_of_week] = row.is_open
        ? { open: String(row.open_time).slice(0, 5), close: String(row.close_time).slice(0, 5) }
        : null;
    });
    set({ hours: mapped });
  }
}));
