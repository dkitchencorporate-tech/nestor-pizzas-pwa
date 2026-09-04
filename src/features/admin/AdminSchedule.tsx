import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DayRow {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes..Domingo
const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};

export default function AdminSchedule() {
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savedDay, setSavedDay] = useState<number | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('store_hours').select('*').order('day_of_week');
    if (!error && data && data.length > 0) {
      setRows(data as DayRow[]);
      setLoadError(false);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const updateLocal = (day: number, patch: Partial<DayRow>) => {
    setRows(prev => prev.map(r => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const saveDay = async (day: number) => {
    const row = rows.find(r => r.day_of_week === day);
    if (!row) return;
    setSavingDay(day);
    const { error } = await supabase
      .from('store_hours')
      .update({
        is_open: row.is_open,
        open_time: row.is_open ? row.open_time : null,
        close_time: row.is_open ? row.close_time : null,
      })
      .eq('day_of_week', day);
    setSavingDay(null);
    if (!error) {
      setSavedDay(day);
      setTimeout(() => setSavedDay(null), 1600);
    } else {
      alert('No se pudo guardar el horario de este día: ' + error.message);
    }
  };

  const todayDow = new Date().getDay();
  const todayRow = rows.find(r => r.day_of_week === todayDow);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider mb-1">🕒 Horarios</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Configura aquí el horario semanal para hacer pedidos. Los cambios se aplican al instante en la web
        (nestorpizzas.es), sin necesidad de avisar a soporte técnico.
      </p>

      {loadError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
          No se pudo cargar la tabla de horarios (<code>store_hours</code>). Si es la primera vez que ves este
          mensaje, es probable que la migración de base de datos aún no se haya ejecutado — contacta con soporte
          técnico.
        </div>
      )}

      {todayRow && (
        <div className="mb-6 bg-zinc-900 border border-green-500/30 rounded-2xl p-4">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Hoy ({DAY_LABELS[todayDow]})</span>
          <p className="text-white font-bold text-lg mt-1">
            {todayRow.is_open
              ? `Abierto de ${todayRow.open_time?.slice(0, 5)} a ${todayRow.close_time?.slice(0, 5)}`
              : 'Cerrado'}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {DAY_ORDER.map(day => {
            const row = rows.find(r => r.day_of_week === day);
            if (!row) return null;
            return (
              <div
                key={day}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="flex items-center justify-between sm:w-40 shrink-0">
                  <span className="font-bold text-white">{DAY_LABELS[day]}</span>
                  <button
                    onClick={() => updateLocal(day, { is_open: !row.is_open })}
                    className={`ml-3 relative w-12 h-6 rounded-full transition-colors ${row.is_open ? 'bg-green-500' : 'bg-zinc-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${row.is_open ? 'translate-x-6' : ''}`}
                    ></span>
                  </button>
                </div>

                {row.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={row.open_time?.slice(0, 5) || ''}
                      onChange={(e) => updateLocal(day, { open_time: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <span className="text-zinc-500">a</span>
                    <input
                      type="time"
                      value={row.close_time?.slice(0, 5) || ''}
                      onChange={(e) => updateLocal(day, { close_time: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-zinc-500 text-sm italic">Cerrado todo el día</span>
                )}

                <button
                  onClick={() => saveDay(day)}
                  disabled={savingDay === day}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shrink-0"
                >
                  {savingDay === day ? 'Guardando...' : savedDay === day ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
