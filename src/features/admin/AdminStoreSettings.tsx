import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export default function AdminStoreSettings() {
  const { minOrderDelivery, deliveryFee, fetchSettings, updateSettings } = useSettingsStore();

  const [minDeliveryInput, setMinDeliveryInput] = useState<number>(minOrderDelivery);
  const [feeInput, setFeeInput] = useState<number>(deliveryFee);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setMinDeliveryInput(minOrderDelivery);
    setFeeInput(deliveryFee);
  }, [minOrderDelivery, deliveryFee]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateSettings({
        minOrderDelivery: Number(minDeliveryInput),
        deliveryFee: Number(feeInput)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 text-white">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-black tracking-wide uppercase flex items-center gap-3">
          <span>⚙️</span> Ajustes de Tienda y Reparto
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Configuración en vivo del servicio a domicilio, importes mínimos y política de cobro para Néstor Pizzas.
        </p>
      </div>

      {saveSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-4 flex items-center gap-3 text-green-400 animate-fade-in shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <span className="text-xl">✅</span>
          <span className="font-bold text-sm">Ajustes actualizados correctamente en la base de datos en tiempo real.</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-sm">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h3 className="text-lg font-display font-black uppercase tracking-wider text-green-400 border-b border-zinc-800 pb-3 flex items-center gap-2">
          <span>🛵</span> Condiciones de Reparto a Domicilio (Caniles)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Importe Mínimo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Importe Mínimo Domicilio (€) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.50"
                min="0"
                value={minDeliveryInput}
                onChange={(e) => setMinDeliveryInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0A0A0E] border border-zinc-700 rounded-2xl px-4 py-3.5 text-xl font-black text-white focus:outline-none focus:border-green-500 pr-10"
                required
              />
              <span className="absolute right-4 top-3.5 text-zinc-500 font-bold text-lg">€</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              La app bloqueará automáticamente cualquier pedido online que no alcance este importe para envíos a domicilio.
            </p>
          </div>

          {/* Coste de Envío */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Coste de Envío (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.50"
                min="0"
                value={feeInput}
                onChange={(e) => setFeeInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0A0A0E] border border-zinc-700 rounded-2xl px-4 py-3.5 text-xl font-black text-white focus:outline-none focus:border-green-500 pr-10"
              />
              <span className="absolute right-4 top-3.5 text-zinc-500 font-bold text-lg">€</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Coste base de entrega aplicado en los pedidos configurados para envío.
            </p>
          </div>
        </div>

        {/* Políticas Activas */}
        <div className="bg-[#0A0A0E] border border-zinc-800/80 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Políticas Operativas Vigentes (Modo Producción)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span><strong>Solo a Domicilio:</strong> Los pedidos para recoger en local han sido desactivados temporalmente por orden de dirección.</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>Solo Pago con Tarjeta:</strong> Todos los pedidos online requieren pago anticipado mediante la pasarela segura SumUp (Apple Pay / Google Pay / Tarjeta).</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span><strong>Zona de Cobertura:</strong> Estrictamente limitado al Código Postal 18810 (Caniles, Granada).</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-display font-black uppercase tracking-wider px-8 py-4 rounded-2xl shadow-[0_10px_25px_rgba(22,163,74,0.3)] transition-all hover:scale-105 text-sm"
          >
            {isSaving ? 'Guardando Ajustes...' : '💾 Guardar Cambios en Ajustes'}
          </button>
        </div>
      </form>
    </div>
  );
}
