import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminCategoryForm from './components/AdminCategoryForm';
import AdminProductForm from './components/AdminProductForm';

export default function AdminCatalog() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });
  const [productModal, setProductModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').order('category_id')
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (prodsRes.data) setProducts(prodsRes.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      showNotification('Error al cargar el catálogo', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleProductActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (error) {
      showNotification('Error al actualizar estado', 'error');
    } else {
      fetchData();
    }
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto? Si ya ha sido pedido, es mejor simplemente desactivarlo.')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showNotification('No se pudo eliminar (probablemente está en pedidos históricos). Desactívalo en su lugar.', 'error');
    } else {
      showNotification('Producto eliminado', 'success');
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    const hasProducts = products.some(p => p.category_id === id);
    if (hasProducts) {
      showNotification('No puedes eliminar una categoría que tiene productos. Mueve o borra sus productos primero.', 'error');
      return;
    }

    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      showNotification('Error al eliminar categoría', 'error');
    } else {
      showNotification('Categoría eliminada', 'success');
      fetchData();
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-[3000] p-4 rounded-xl shadow-lg border ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        } animate-fade-in`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide">
            Gestión <span className="text-green-500">Profesional</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">Control total sobre categorías y productos de la carta.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setCategoryModal({ isOpen: true })}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            + Nueva Categoría
          </button>
          <button 
            onClick={() => setProductModal({ isOpen: true })}
            className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm font-bold transition-colors"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.category_id === category.id);
            
            return (
              <div key={category.id} className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
                  <div>
                    <h3 className="text-xl font-display font-black text-white uppercase">{category.name}</h3>
                    {category.description && <p className="text-sm text-gray-500 mt-1">{category.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCategoryModal({ isOpen: true, data: category })}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-400 transition-colors"
                      title="Editar categoría"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button 
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Eliminar categoría"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryProducts.map(product => (
                    <div key={product.id} className={`bg-[#1A1A24] border ${product.is_active ? 'border-zinc-700/50' : 'border-red-900/30 opacity-50'} rounded-2xl p-4 flex flex-col gap-3 transition-all`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-sm">{product.name}</h4>
                          <span className="text-green-500 font-bold text-xs">{product.price.toFixed(2)}€</span>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button 
                            onClick={() => toggleProductActive(product.id, product.is_active)}
                            className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${product.is_active ? 'bg-green-500' : 'bg-zinc-700'}`}
                            title={product.is_active ? 'Ocultar producto' : 'Mostrar producto'}
                          >
                            <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${product.is_active ? 'left-[22px]' : 'left-[2px]'}`}></div>
                          </button>
                          
                          <div className="flex gap-1 mt-2">
                            <button 
                              onClick={() => setProductModal({ isOpen: true, data: product })}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-400 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button 
                              onClick={() => deleteProduct(product.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {product.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                  ))}
                  
                  {categoryProducts.length === 0 && (
                    <div className="col-span-full py-4 text-center border border-dashed border-zinc-800 rounded-2xl text-gray-500 text-sm">
                      No hay productos en esta categoría.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categoryModal.isOpen && (
        <AdminCategoryForm
          category={categoryModal.data}
          onClose={() => setCategoryModal({ isOpen: false })}
          onSuccess={() => {
            setCategoryModal({ isOpen: false });
            fetchData();
            showNotification('Categoría guardada con éxito', 'success');
          }}
        />
      )}

      {productModal.isOpen && (
        <AdminProductForm
          product={productModal.data}
          categories={categories}
          onClose={() => setProductModal({ isOpen: false })}
          onSuccess={() => {
            setProductModal({ isOpen: false });
            fetchData();
            showNotification('Producto guardado con éxito', 'success');
          }}
        />
      )}
    </div>
  );
}
