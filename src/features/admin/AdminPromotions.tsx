import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLoyaltyStore, LoyaltyReward, LoyaltyConfig } from '../../store/loyaltyStore';

export default function AdminPromotions() {
  const { config, isLoaded, isSaving, fetchLoyaltyConfig, updateLoyaltyConfig } = useLoyaltyStore();
  const [localConfig, setLocalConfig] = useState<LoyaltyConfig>(config);
  const [products, setProducts] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado para nueva promoción / recompensa por puntos
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPointsCost, setNewPointsCost] = useState<number>(20);
  const [newMinOrder, setNewMinOrder] = useState<number>(15);
  const [newTargetType, setNewTargetType] = useState<'pizzas_sugerencia' | 'product'>('product');
  const [newProductId, setNewProductId] = useState<number | ''>('');

  useEffect(() => {
    fetchLoyaltyConfig();
    supabase
      .from('products')
      .select('id, name, category, price, is_active')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setProducts(data);
      });
  }, [fetchLoyaltyConfig]);

  useEffect(() => {
    if (isLoaded) {
      setLocalConfig(config);
      setNewMinOrder(config.min_order_to_redeem || 15);
    }
  }, [config, isLoaded]);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveGlobalRules = async () => {
    try {
      // Sincronizar también el pedido mínimo en la recompensa estándar si coincide
      const updatedRewards = localConfig.rewards.map((r) =>
        r.id === 'vip-pizza-sugerencia'
          ? { ...r, min_order: Number(localConfig.min_order_to_redeem) || 15 }
          : r
      );
      const nextConfig: LoyaltyConfig = {
        ...localConfig,
        points_per_10_eur: Math.max(0, Number(localConfig.points_per_10_eur) || 2),
        min_order_to_redeem: Math.max(0, Number(localConfig.min_order_to_redeem) || 15),
        rewards: updatedRewards,
      };
      await updateLoyaltyConfig(nextConfig);
      setLocalConfig(nextConfig);
      showToast('ok', '✅ Reglas de Puntos VIP y Promociones guardadas y sincronizadas en tiempo real.');
    } catch (err: any) {
      showToast('err', err.message || 'Error al guardar las reglas VIP.');
    }
  };

  const handleToggleReward = async (id: string) => {
    const updated = localConfig.rewards.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
    const nextConfig = { ...localConfig, rewards: updated };
    setLocalConfig(nextConfig);
    try {
      await updateLoyaltyConfig(nextConfig);
      showToast('ok', '✅ Estado de la promoción actualizado.');
    } catch (err: any) {
      showToast('err', err.message || 'Error al actualizar promoción.');
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (id === 'vip-pizza-sugerencia') {
      showToast('err', 'La recompensa principal puedes pausarla con el interruptor, pero no eliminarla.');
      return;
    }
    const updated = localConfig.rewards.filter((r) => r.id !== id);
    const nextConfig = { ...localConfig, rewards: updated };
    setLocalConfig(nextConfig);
    try {
      await updateLoyaltyConfig(nextConfig);
      showToast('ok', '🗑️ Promoción eliminada correctamente.');
    } catch (err: any) {
      showToast('err', err.message || 'Error al eliminar promoción.');
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    let resolvedProductName = 'Cualquier Pizza Sugerencia';
    let resolvedProductId: number | null = null;

    if (newTargetType === 'product') {
      const found = products.find((p) => Number(p.id) === Number(newProductId));
      if (!found) {
        showToast('err', 'Selecciona un producto del catálogo para vincularlo a los puntos.');
        return;
      }
      resolvedProductName = found.name;
      resolvedProductId = Number(found.id);
    }

    const title = newTitle.trim() || `${resolvedProductName} Gratis con Puntos`;
    const pointsCost = Math.max(1, Number(newPointsCost) || 20);
    const minOrder = Math.max(0, Number(newMinOrder) || localConfig.min_order_to_redeem || 15);
    const description =
      newDescription.trim() ||
      `Canjea ${pointsCost} puntos VIP por ${resolvedProductName} gratis en pedidos desde ${minOrder.toFixed(2)} €.`;

    const newReward: LoyaltyReward = {
      id: `promo-${Date.now()}`,
      title,
      description,
      points_cost: pointsCost,
      min_order: minOrder,
      target_type: newTargetType,
      product_id: resolvedProductId,
      product_name: resolvedProductName,
      active: true,
    };

    const nextConfig: LoyaltyConfig = {
      ...localConfig,
      rewards: [...localConfig.rewards, newReward],
    };

    try {
      await updateLoyaltyConfig(nextConfig);
      setLocalConfig(nextConfig);
      setNewTitle('');
      setNewDescription('');
      setNewPointsCost(20);
      setNewMinOrder(localConfig.min_order_to_redeem || 15);
      setNewProductId('');
      showToast('ok', `🎁 Promoción "${title}" creada y publicada en la App.`);
    } catch (err: any) {
      showToast('err', err.message || 'Error al crear la promoción.');
    }
  };

  const handleCopySocialText = (reward: LoyaltyReward) => {
    const text = `🍕🔥 ¡PROMO VIP EN NÉSTOR PIZZAS CANILES! 🔥🍕\n\n🎁 ${reward.title.toUpperCase()}\n✨ Canjea solo ${reward.points_cost} puntos de tu Club VIP y llévate "${reward.product_name}" GRATIS en tu pedido superior a ${Number(reward.min_order).toFixed(2)} €.\n\n📲 Haz tu pedido directo en: https://nestorpizzas.es\n⭐ Acumulas ${localConfig.points_per_10_eur} puntos por cada 10 € de compra.`;
    navigator.clipboard?.writeText(text);
    setCopiedId(reward.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-[#0A0A0E] text-white space-y-8 custom-scrollbar">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
            Club VIP &amp; Marketing Redes Sociales
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-wide text-white mt-2">
            🎁 Promociones, Ofertas y Puntos VIP
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Configura las reglas de fidelización, el pedido mínimo para canjear puntos y vincula productos del catálogo con puntos VIP.
          </p>
        </div>

        <button
          onClick={handleSaveGlobalRules}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(22,163,74,0.35)] transition-all shrink-0"
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Configuración VIP'}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs underline ml-4">
            Cerrar
          </button>
        </div>
      )}

      {/* Bloque 1: Reglas Generales de Fidelización */}
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-display font-black uppercase text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>1. Reglas Generales del Sistema de Puntos</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Estas condiciones se aplican automáticamente en la App, el Checkout, SumUp y la Base de Datos.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
              {localConfig.enabled ? '🟢 Club VIP Activo' : '🔴 Club VIP Pausado'}
            </span>
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
              className="w-5 h-5 accent-green-500 rounded cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Puntos por cada 10€ */}
          <div className="bg-[#0A0A0E] border border-zinc-800 rounded-2xl p-4">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
              ⭐ Puntos ganados por cada 10,00 €
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={50}
                value={localConfig.points_per_10_eur}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, points_per_10_eur: Math.max(0, Number(e.target.value)) })
                }
                className="w-full bg-[#14141E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-xl font-black text-white outline-none"
              />
              <span className="text-sm font-bold text-zinc-400 whitespace-nowrap">ptos / 10 €</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Por defecto: <strong>2 puntos</strong> por cada 10 € abonados en el pedido.
            </p>
          </div>

          {/* Pedido mínimo para canjear puntos */}
          <div className="bg-[#0A0A0E] border border-emerald-500/30 rounded-2xl p-4">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
              🛒 Pedido Mínimo para Canjear Puntos (€)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                step="0.5"
                value={localConfig.min_order_to_redeem}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  setLocalConfig({
                    ...localConfig,
                    min_order_to_redeem: val,
                    rewards: localConfig.rewards.map((r) =>
                      r.id === 'vip-pizza-sugerencia' ? { ...r, min_order: val } : r
                    ),
                  });
                }}
                className="w-full bg-[#14141E] border border-emerald-500/40 focus:border-emerald-500 rounded-xl px-4 py-3 text-xl font-black text-white outline-none"
              />
              <span className="text-sm font-bold text-zinc-400 whitespace-nowrap">€ mín.</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              El cliente solo podrá usar sus puntos si la suma de productos de su cesta es <strong>igual o superior a {Number(localConfig.min_order_to_redeem).toFixed(2)} €</strong>.
            </p>
          </div>

          {/* Resumen de seguridad en Checkout */}
          <div className="bg-[#0A0A0E] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-400 block mb-1">
                🛡️ Comportamiento en Checkout y Ticket
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Cuando el pedido alcanza <strong>{Number(localConfig.min_order_to_redeem).toFixed(2)} €</strong> y el cliente canjea sus puntos, el sistema descuenta automáticamente el valor del producto elegido, <strong>sin bloquear el envío a domicilio</strong> y reflejando el artículo canjeado tanto en Admin como en la impresora térmica.
              </p>
            </div>
            <button
              onClick={handleSaveGlobalRules}
              disabled={isSaving}
              className="mt-3 w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Aplicar Reglas Ahora
            </button>
          </div>
        </div>
      </div>

      {/* Bloque 2: Catálogo de Recompensas y Promociones por Puntos Activas */}
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-display font-black uppercase text-white">
              🎁 2. Recompensas y Promociones por Puntos Activas ({localConfig.rewards.length})
            </h3>
            <p className="text-xs text-zinc-400">
               Estas ofertas aparecen automáticamente en el perfil VIP del cliente y en el Checkout cuando tiene los puntos requeridos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localConfig.rewards.map((reward) => (
            <div
              key={reward.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                reward.active
                  ? 'bg-[#0A0A0E] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'bg-[#0A0A0E]/50 border-zinc-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        reward.active
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {reward.active ? 'ACTIVA EN APP' : 'PAUSADA'}
                    </span>
                    <h4 className="text-lg font-display font-black text-white uppercase mt-2">{reward.title}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-amber-400 block">{reward.points_cost} PTOS</span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      Pedido mín. {Number(reward.min_order || localConfig.min_order_to_redeem).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 mt-2">{reward.description}</p>

                <div className="mt-3 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Producto vinculado:</span>
                  <span className="font-black text-amber-300 uppercase">{reward.product_name}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleToggleReward(reward.id)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                    reward.active
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  }`}
                >
                  {reward.active ? '⏸️ Pausar' : '▶️ Activar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopySocialText(reward)}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
                >
                  {copiedId === reward.id ? '✅ ¡Texto Copiado!' : '📲 Copiar Post Redes'}
                </button>

                {reward.id !== 'vip-pizza-sugerencia' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteReward(reward.id)}
                    className="py-2 px-3 rounded-xl font-bold text-xs uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                    title="Eliminar promoción"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloque 3: Crear Nueva Promoción / Vincular Producto con Puntos */}
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-lg font-display font-black uppercase text-white mb-1">
          ➕ 3. Crear Nueva Promoción por Puntos (Para App y Redes Sociales)
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Correlaciona cualquier producto de tu carta con una cantidad de puntos y un pedido mínimo. En cuanto la crees, aparecerá en la App y el Checkout aplicará el descuento de forma segura.
        </p>

        <form onSubmit={handleCreateReward} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Tipo de Producto a Canjear
            </label>
            <select
              value={newTargetType}
              onChange={(e) => setNewTargetType(e.target.value as 'pizzas_sugerencia' | 'product')}
              className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
            >
              <option value="product">Producto específico del catálogo (Pizzas, Bocatas, Complementos...)</option>
              <option value="pizzas_sugerencia">Todas las Pizzas Sugerencia (Nuestras Pizzas / Pizzas Blancas)</option>
            </select>
          </div>

          {newTargetType === 'product' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Selecciona el Producto del Catálogo *
              </label>
              <select
                value={newProductId}
                onChange={(e) => {
                  const idVal = e.target.value ? Number(e.target.value) : '';
                  setNewProductId(idVal);
                  const found = products.find((p) => Number(p.id) === Number(idVal));
                  if (found && !newTitle) {
                    setNewTitle(`${found.name} Gratis con Puntos`);
                  }
                }}
                required
                className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
              >
                <option value="">-- Elige un producto de la carta --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.name} — {Number(p.price).toFixed(2)} €
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Categoría Objetivo
              </label>
              <div className="w-full bg-[#0A0A0E] border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-amber-400">
                🍕 Cualquier Pizza Sugerencia (Nuestras Pizzas y Pizzas Blancas)
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Título de la Promoción (Visible en la App)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej: Pizza Dulce Gratis con 15 Puntos"
              className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                Coste en Puntos VIP *
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={newPointsCost}
                onChange={(e) => setNewPointsCost(Math.max(1, Number(e.target.value)))}
                required
                className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-black text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                Pedido Mínimo (€) *
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={newMinOrder}
                onChange={(e) => setNewMinOrder(Math.max(0, Number(e.target.value)))}
                required
                className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm font-black text-white outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Descripción / Condiciones para el Cliente (Opcional)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={`Ej: Canjea ${newPointsCost} puntos por este producto gratis en pedidos superiores a ${Number(newMinOrder).toFixed(2)} €`}
              className="w-full bg-[#0A0A0E] border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-wider py-4 rounded-2xl text-sm shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all"
            >
              🚀 Publicar Promoción de Puntos en la App
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
