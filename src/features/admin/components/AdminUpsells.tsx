import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminUpsells() {
  const [upsells, setUpsells] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUpsell, setCurrentUpsell] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_id: 0,
    category: 'RECOMENDACIÓN',
    sort_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch upsells (join with products to get name/price)
    const [upsellsRes, productsRes] = await Promise.all([
      supabase.from('upsells').select(`
        id, category, sort_order, product_id,
        products (
          name, price, img_url, is_active
        )
      `).order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('name')
    ]);
    
    if (upsellsRes.error) {
      console.error('Error fetching upsells:', upsellsRes.error);
      alert('Error cargando upsells: ' + upsellsRes.error.message);
    }
    
    if (upsellsRes.data) setUpsells(upsellsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    setIsLoading(false);
  };

  const handleEdit = (upsell: any) => {
    setCurrentUpsell(upsell);
    setFormData({
      product_id: upsell.product_id,
      category: upsell.category,
      sort_order: upsell.sort_order || 0
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentUpsell(null);
    setFormData({
      product_id: products.length > 0 ? products[0].id : 0,
      category: 'RECOMENDACIÓN',
      sort_order: upsells.length + 1
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres borrar este upsell?')) return;
    const { error } = await supabase.from('upsells').delete().eq('id', id);
    if (error) {
      alert('Error borrando upsell: ' + error.message);
    }
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUpsell) {
      const { error } = await supabase.from('upsells').update({
        product_id: formData.product_id,
        category: formData.category,
        sort_order: formData.sort_order
      }).eq('id', currentUpsell.id);
      
      if (error) alert('Error actualizando: ' + error.message);
    } else {
      const { error } = await supabase.from('upsells').insert([{
        product_id: formData.product_id,
        category: formData.category,
        sort_order: formData.sort_order
      }]);
      
      if (error) alert('Error creando: ' + error.message);
    }
    setIsEditing(false);
    fetchData();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando sugerencias...</div>;
  }

  return (
    <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 mt-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-xl font-display font-black text-white uppercase">Sugerencias (Upsells)</h3>
          <p className="text-sm text-gray-500 mt-1">Lo que se ofrece justo antes de pagar, conectado a productos reales.</p>
        </div>
        <button 
          onClick={handleNew}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-colors shadow-lg shadow-yellow-500/20"
        >
          + Nueva Sugerencia
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-[#1A1A24] border border-zinc-700/50 rounded-2xl p-6 mb-6 animate-fade-in">
          <h4 className="font-bold text-white mb-4">{currentUpsell ? 'Editar Sugerencia' : 'Nueva Sugerencia'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Producto del Menú</label>
              <select 
                required 
                value={formData.product_id} 
                onChange={e => setFormData({...formData, product_id: Number(e.target.value)})} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white"
              >
                <option value={0} disabled>-- Selecciona un producto --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.price.toFixed(2)}€</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">El precio y la información se sincronizan automáticamente con el producto original.</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Título de Grupo (Categoría del Modal)</label>
              <input 
                type="text" 
                required 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} 
                placeholder="EJ: SALSAS, ENTRANTES, POSTRES" 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white uppercase" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Orden de Aparición</label>
              <input 
                type="number" 
                required 
                value={formData.sort_order} 
                onChange={e => setFormData({...formData, sort_order: Number(e.target.value)})} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white" 
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20">Guardar Sugerencia</button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {upsells.map(upsell => {
          const prod = upsell.products;
          if (!prod) return null; // Defensive check
          return (
            <div key={upsell.id} className="bg-[#1A1A24] border border-zinc-700/50 rounded-2xl p-4 flex justify-between items-center gap-4">
              {prod.img_url && (
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-black">
                  <img src={prod.img_url} alt="" className="w-full h-full object-cover opacity-80" />
                </div>
              )}
              <div className="flex-1">
                <span className="text-[10px] text-yellow-500 font-bold uppercase">{upsell.category} (Orden: {upsell.sort_order})</span>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  {prod.name}
                  {!prod.is_active && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded-full">INACTIVO</span>}
                </h4>
                <span className="font-bold text-green-500 mt-1 block">{prod.price.toFixed(2)}€</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(upsell)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => handleDelete(upsell.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          );
        })}
        {upsells.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-zinc-800 rounded-2xl">
            No hay sugerencias configuradas. Añade una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
