import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminUpsells() {
  const [upsells, setUpsells] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUpsell, setCurrentUpsell] = useState<any>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    category: '',
    sort_order: 0
  });

  useEffect(() => {
    fetchUpsells();
  }, []);

  const fetchUpsells = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('upsells').select('*').order('sort_order', { ascending: true });
    if (data) setUpsells(data);
    setIsLoading(false);
  };

  const handleEdit = (upsell: any) => {
    setCurrentUpsell(upsell);
    setFormData({
      id: upsell.id,
      name: upsell.name,
      description: upsell.description || '',
      price: upsell.price,
      category: upsell.category,
      sort_order: upsell.sort_order || 0
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentUpsell(null);
    setFormData({
      id: 'u' + Date.now(),
      name: '',
      description: '',
      price: 0,
      category: 'RECOMENDACIÓN',
      sort_order: upsells.length + 1
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres borrar este upsell?')) return;
    await supabase.from('upsells').delete().eq('id', id);
    fetchUpsells();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUpsell) {
      await supabase.from('upsells').update({
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        sort_order: formData.sort_order
      }).eq('id', currentUpsell.id);
    } else {
      await supabase.from('upsells').insert([{
        id: formData.id,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        sort_order: formData.sort_order
      }]);
    }
    setIsEditing(false);
    fetchUpsells();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando sugerencias...</div>;
  }

  return (
    <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 mt-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-xl font-display font-black text-white uppercase">Sugerencias (Upsells)</h3>
          <p className="text-sm text-gray-500 mt-1">Lo que se ofrece justo antes de pagar</p>
        </div>
        <button 
          onClick={handleNew}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-colors"
        >
          + Nueva Sugerencia
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-[#1A1A24] border border-zinc-700/50 rounded-2xl p-6 mb-6 animate-fade-in">
          <h4 className="font-bold text-white mb-4">{currentUpsell ? 'Editar Sugerencia' : 'Nueva Sugerencia'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio (€)</label>
              <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Categoría (Título en Modal)</label>
              <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} placeholder="EJ: ENTRANTES, SALSAS" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Orden</label>
              <input type="number" required value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Descripción (Opcional)</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400">Guardar</button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {upsells.map(upsell => (
          <div key={upsell.id} className="bg-[#1A1A24] border border-zinc-700/50 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-yellow-500 font-bold uppercase">{upsell.category} (Orden: {upsell.sort_order})</span>
              <h4 className="font-bold text-white text-sm">{upsell.name}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{upsell.description}</p>
              <span className="font-bold text-green-500 mt-1 block">{upsell.price.toFixed(2)}€</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(upsell)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-400">
                ✏️
              </button>
              <button onClick={() => handleDelete(upsell.id)} className="p-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400">
                🗑️
              </button>
            </div>
          </div>
        ))}
        {upsells.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-zinc-800 rounded-2xl">
            No hay sugerencias configuradas. Añade una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
