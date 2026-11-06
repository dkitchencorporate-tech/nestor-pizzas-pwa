import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export default function AdminStoreSettings() {
  const settings = useSettingsStore();

  // Estados locales para el formulario
  const [minDeliveryInput, setMinDeliveryInput] = useState<number>(settings.minOrderDelivery);
  const [feeInput, setFeeInput] = useState<number>(settings.deliveryFee);

  // Switches Domicilio
  const [allowDelivery, setAllowDelivery] = useState<boolean>(settings.allowDelivery);
  const [deliveryAllowCard, setDeliveryAllowCard] = useState<boolean>(settings.deliveryAllowCard);
  const [deliveryAllowCash, setDeliveryAllowCash] = useState<boolean>(settings.deliveryAllowCash);

  // Switches Recogida
  const [allowPickup, setAllowPickup] = useState<boolean>(settings.allowPickup);
  const [pickupAllowCard, setPickupAllowCard] = useState<boolean>(settings.pickupAllowCard);
  const [pickupAllowCash, setPickupAllowCash] = useState<boolean>(settings.pickupAllowCash);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    settings.fetchSettings();
  }, []);

  useEffect(() => {
    setMinDeliveryInput(settings.minOrderDelivery);
    setFeeInput(settings.deliveryFee);
    setAllowDelivery(settings.allowDelivery);
    setDeliveryAllowCard(settings.deliveryAllowCard);
    setDeliveryAllowCash(settings.deliveryAllowCash);
    setAllowPickup(settings.allowPickup);
    setPickupAllowCard(settings.pickupAllowCard);
    setPickupAllowCash(settings.pickupAllowCash);
  }, [
    settings.minOrderDelivery,
    settings.deliveryFee,
    settings.allowDelivery,
    settings.deliveryAllowCard,
    settings.deliveryAllowCash,
    settings.allowPickup,
    settings.pickupAllowCard,
    settings.pickupAllowCash
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    // Validación: si se activa un método, debe tener al menos una forma de pago
    if (allowDelivery && !deliveryAllowCard && !deliveryAllowCash) {
      setErrorMessage('Los pedidos a domicilio deben tener al menos una forma de pago habilitada (tarjeta o efectivo).');
      setIsSaving(false);
      return;
    }

    if (allowPickup && !pickupAllowCard && !pickupAllowCash) {
      setErrorMessage('Los pedidos para recoger deben tener al menos una forma de pago habilitada (tarjeta o efectivo).');
      setIsSaving(false);
      return;
    }

    try {
      await settings.updateSettings({
        minOrderDelivery: Number(minDeliveryInput),
        deliveryFee: Number(feeInput),
        allowDelivery,
        deliveryAllowCard,
        deliveryAllowCash,
        allowPickup,
        pickupAllowCard,
        pickupAllowCash
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 text-white pb-20">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-black tracking-wide uppercase flex items-center gap-3">
          <span>⚙️</span> Control de Operaciones y Métodos de Pedido
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Néstor decide en cualquier momento qué pedidos acepta (domicilio/recogida) y qué formas de pago permite para cada uno (tarjeta/efectivo). Los cambios se aplican al instante en la PWA de los clientes.
        </p>
      </div>

      {saveSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-4 flex items-center gap-3 text-green-400 animate-fade-in shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <span className="text-xl">✅</span>
          <span className="font-bold text-sm">Ajustes actualizados en tiempo real. La app de los clientes ya refleja estos cambios.</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-sm">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* BLOQUE 1: REPARTO A DOMICILIO */}
        <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛵</span>
              <div>
                <h3 className="text-lg font-display font-black uppercase tracking-wider text-green-400">
                  Reparto a Domicilio (Caniles CP 18810)
                </h3>
                <p className="text-xs text-zinc-400">Pedidos entregados por los repartidores en el domicilio del cliente.</p>
              </div>
            </div>
            {/* Switch Principal Domicilio */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowDelivery}
                onChange={(e) => setAllowDelivery(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {allowDelivery ? (
            <div className="space-y-6 animate-fade-in">
              {/* Formas de Pago Domicilio */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-3">
                  Formas de pago permitidas para pedidos a Domicilio:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarjeta / SumUp */}
                  <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${deliveryAllowCard ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[#0A0A0E] border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💳</span>
                      <div>
                        <span className="font-bold text-white text-sm block">Pago con Tarjeta Online</span>
                        <span className="text-xs text-zinc-400">SumUp / Apple Pay / Google Pay</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={deliveryAllowCard}
                      onChange={(e) => setDeliveryAllowCard(e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0"
                    />
                  </label>

                  {/* Efectivo repartidor */}
                  <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${deliveryAllowCash ? 'bg-green-500/10 border-green-500/50' : 'bg-[#0A0A0E] border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💵</span>
                      <div>
                        <span className="font-bold text-white text-sm block">Efectivo al Repartidor</span>
                        <span className="text-xs text-zinc-400">Cobro presencial en la entrega</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={deliveryAllowCash}
                      onChange={(e) => setDeliveryAllowCash(e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-green-500 focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              {/* Importes Domicilio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-zinc-800/80">
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
                    Bloquea pedidos que no alcancen esta cantidad mínima.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Coste de Envío / Reparto (€)
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
                    Suplemento por servicio de reparto si corresponde.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center text-sm text-red-400">
              ⛔ Los pedidos a domicilio están actualmente desactivados. Los clientes verán que el reparto a domicilio no está disponible.
            </div>
          )}
        </div>

        {/* BLOQUE 2: RECOGIDA EN LOCAL */}
        <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛍️</span>
              <div>
                <h3 className="text-lg font-display font-black uppercase tracking-wider text-amber-400">
                  Pedidos para Recoger en Local (C. Alcalde Felip, 9)
                </h3>
                <p className="text-xs text-zinc-400">El cliente realiza el pedido por la PWA y acude al local a recogerlo.</p>
              </div>
            </div>
            {/* Switch Principal Recogida */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowPickup}
                onChange={(e) => setAllowPickup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {allowPickup ? (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-3">
                  Formas de pago permitidas para Recogida en Local:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarjeta antes de recoger */}
                  <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${pickupAllowCard ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[#0A0A0E] border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💳</span>
                      <div>
                        <span className="font-bold text-white text-sm block">Pagar con Tarjeta por Adelantado</span>
                        <span className="text-xs text-zinc-400">El pedido debe estar pagado online antes de recoger</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={pickupAllowCard}
                      onChange={(e) => setPickupAllowCard(e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0"
                    />
                  </label>

                  {/* Efectivo al recoger en local */}
                  <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${pickupAllowCash ? 'bg-green-500/10 border-green-500/50' : 'bg-[#0A0A0E] border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💶</span>
                      <div>
                        <span className="font-bold text-white text-sm block">Pagar en Efectivo al Recoger</span>
                        <span className="text-xs text-zinc-400">El cliente paga en mano al retirar en mostrador</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={pickupAllowCash}
                      onChange={(e) => setPickupAllowCash(e.target.checked)}
                      className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-green-500 focus:ring-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center text-sm text-amber-400">
              ⏸️ Los pedidos para recoger están pausados actualmente. Néstor puede reactivarlos en cualquier momento encendiendo el interruptor arriba.
            </div>
          )}
        </div>

        {/* BOTÓN GUARDAR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-display font-black uppercase tracking-wider px-10 py-5 rounded-2xl shadow-[0_10px_30px_rgba(22,163,74,0.35)] transition-all hover:scale-105 text-base flex items-center gap-3"
          >
            <span>{isSaving ? '⏳' : '💾'}</span>
            <span>{isSaving ? 'Guardando Ajustes...' : 'Guardar y Aplicar en Producción'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
