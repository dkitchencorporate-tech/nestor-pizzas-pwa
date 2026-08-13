import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminCatalog() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name)').order('category_id');
    if (data) setProducts(data);
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    fetchProducts();
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide mb-6">
        Gestión de <span className="text-green-500">Catálogo (Kill-Switch)</span>
      </h2>
      <div className="bg-[#14141E] border border-zinc-800 rounded-2xl p-6">
        <p className="text-gray-400 mb-6">Activa o desactiva productos en tiempo real. Si desactivas un producto, desaparecerá instantáneamente de la carta de los clientes.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="bg-[#1A1A24] border border-zinc-700/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">{product.name}</h4>
                <p className="text-[10px] text-gray-500 font-mono">{product.categories?.name}</p>
              </div>
              <button 
                onClick={() => toggleActive(product.id, product.is_active)}
                className={`w-12 h-6 rounded-full relative transition-colors ${product.is_active ? 'bg-green-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${product.is_active ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              No se han cargado productos desde Supabase aún. Ejecuta el script de migración.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
