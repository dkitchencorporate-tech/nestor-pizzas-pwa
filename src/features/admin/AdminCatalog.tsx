import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminCategoryForm from './components/AdminCategoryForm';
import AdminProductForm from './components/AdminProductForm';
import AdminUpsells from './components/AdminUpsells';
import AdminSubcategoryForm from './components/AdminSubcategoryForm';
import { useI18nStore } from '../../store/i18nStore';

export default function AdminCatalog() {
  const { t, tDynamic } = useI18nStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'upsells'>('catalog');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });
  const [subcategoryModal, setSubcategoryModal] = useState<{ isOpen: boolean; data?: any; categoryId?: string }>({ isOpen: false });
  const [productModal, setProductModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, subcatsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase.from('products').select('*').order('category_id')
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (prodsRes.data) setProducts(prodsRes.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      showNotification(t('error_loading_catalog'), 'error');
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
      showNotification(t('error_updating_status'), 'error');
    } else {
      fetchData();
    }
  };

  const deleteProduct = async (product: any) => {
    if (!window.confirm(t('confirm_delete_product'))) return;
    
    // 1. Borrar la imagen de storage si la tiene
    if (product.img_url && product.img_url.includes('supabase.co')) {
      try {
        const urlObj = new URL(product.img_url);
        const pathParts = urlObj.pathname.split('/products/');
        if (pathParts.length > 1) {
          const fileName = pathParts[1];
          await supabase.storage.from('products').remove([fileName]);
        }
      } catch (e) {
        console.error('No se pudo extraer el nombre del archivo de la url:', e);
      }
    }

    // 2. Borrar de la BD
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      showNotification(t('error_deleting_product'), 'error');
    } else {
      showNotification(t('product_deleted_success'), 'success');
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    const hasProducts = products.some(p => p.category_id === id);
    const hasSubcats = subcategories.some(s => s.category_id === id);
    
    if (hasProducts || hasSubcats) {
      showNotification(t('error_delete_category_with_products'), 'error');
      return;
    }

    if (!window.confirm(t('confirm_delete_category'))) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      showNotification(t('error_deleting_category'), 'error');
    } else {
      showNotification(t('category_deleted_success'), 'success');
      fetchData();
    }
  };

  const deleteSubcategory = async (subcategory: any) => {
    const hasProducts = products.some(p => p.subcategory_id === subcategory.id);
    if (hasProducts) {
      showNotification('No se puede eliminar porque tiene productos asignados', 'error');
      return;
    }

    if (!window.confirm('¿Eliminar esta subcategoría?')) return;
    
    if (subcategory.img_url && subcategory.img_url.includes('supabase.co')) {
      try {
        const urlObj = new URL(subcategory.img_url);
        const pathParts = urlObj.pathname.split('/products/');
        if (pathParts.length > 1) {
          await supabase.storage.from('products').remove([pathParts[1]]);
        }
      } catch (e) {
        console.error('Error parsing url:', e);
      }
    }

    const { error } = await supabase.from('subcategories').delete().eq('id', subcategory.id);
    if (error) {
      showNotification('Error al eliminar subcategoría', 'error');
    } else {
      showNotification('Subcategoría eliminada', 'success');
      fetchData();
    }
  };

  const renderProductCard = (product: any, isBebidas: boolean) => (
    <div key={product.id} className={`bg-[#1A1A24] border ${product.is_active ? 'border-zinc-700/50 hover:border-zinc-600' : 'border-red-900/30 opacity-50'} rounded-2xl p-4 flex flex-col gap-3 transition-all relative overflow-hidden`}>
      {/* Image Thumbnail */}
      {product.img_url && (
        <div className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none">
          <img src={product.img_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex justify-between items-start gap-2 relative z-10">
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            {tDynamic(product.name)}
            {product.img_url && <span className="w-2 h-2 rounded-full bg-blue-500" title={t('has_photo')}></span>}
          </h4>
          {isBebidas && product.subcategory && (
            <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] font-bold rounded uppercase">
              {product.subcategory}
            </span>
          )}
          <span className="text-green-500 font-bold text-xs block mt-1">{product.price.toFixed(2)}€</span>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <button 
            onClick={() => toggleProductActive(product.id, product.is_active)}
            className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${product.is_active ? 'bg-green-500' : 'bg-zinc-700'}`}
            title={product.is_active ? t('hide_product') : t('show_product')}
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
              onClick={() => deleteProduct(product)}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      {product.description && (
        <p className="text-[11px] text-gray-500 line-clamp-2 relative z-10">{tDynamic(product.description)}</p>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto relative no-scrollbar">
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
            {t('gestion_profesional')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{t('control_total_description')}</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 self-stretch sm:self-auto">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'catalog' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('carta')}
          </button>
          <button 
            onClick={() => setActiveTab('upsells')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'upsells' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('upsells')}
          </button>
        </div>
      </div>

      {activeTab === 'upsells' ? (
        <AdminUpsells />
      ) : (
        <>
          <div className="flex justify-end gap-3 mb-6">
            <button 
              onClick={() => setCategoryModal({ isOpen: true })}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-zinc-900/50"
            >
              + {t('new_category')}
            </button>
            <button 
              onClick={() => setProductModal({ isOpen: true })}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-500/20"
            >
              + {t('new_product')}
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              {categories.map(category => {
                const categoryProducts = products.filter(p => p.category_id === category.id);
                const categorySubcats = subcategories.filter(s => s.category_id === category.id);
                
                return (
                  <div key={category.id} className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
                      <div>
                        <h3 className="text-xl font-display font-black text-white uppercase flex items-center gap-2">
                          {tDynamic(category.name)}
                          {categorySubcats.length > 0 && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-full">{categorySubcats.length} subcategorías</span>}
                        </h3>
                        {category.description && <p className="text-sm text-gray-500 mt-1">{tDynamic(category.description)}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSubcategoryModal({ isOpen: true, categoryId: category.id })}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold text-[10px] uppercase transition-colors"
                          title="Añadir Subcategoría"
                        >
                          + Subcategoría
                        </button>
                        <button 
                          onClick={() => setCategoryModal({ isOpen: true, data: category })}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-400 transition-colors"
                          title={t('edit_category')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button 
                          onClick={() => deleteCategory(category.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title={t('delete_category')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>

                    {categorySubcats.length > 0 ? (
                      <div className="space-y-6 mt-4">
                        {categorySubcats.map(sub => {
                          const subProducts = categoryProducts.filter(p => p.subcategory_id === sub.id);
                          return (
                            <div key={sub.id} className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800">
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                  {sub.img_url && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0">
                                      <img src={sub.img_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-bold text-yellow-500 uppercase tracking-widest text-sm flex items-center gap-2">
                                      {sub.name} <span className="text-blue-400 text-[10px]">({sub.name_en})</span>
                                    </h4>
                                    {sub.description && <p className="text-xs text-gray-500">{sub.description}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setSubcategoryModal({ isOpen: true, data: sub, categoryId: category.id })}
                                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-400 rounded-lg transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                  </button>
                                  <button 
                                    onClick={() => deleteSubcategory(sub)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {subProducts.map(product => renderProductCard(product, sub))}
                                {subProducts.length === 0 && (
                                  <div className="col-span-full py-4 text-center border border-dashed border-zinc-800 rounded-xl text-gray-500 text-sm">
                                    No hay productos en esta subcategoría.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Productos en la raíz de la categoría (sin subcategoría) */}
                        {categoryProducts.filter(p => !p.subcategory_id).length > 0 && (
                          <div className="mt-6 pt-4 border-t border-zinc-800/50">
                            <h4 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4 px-2">Otros Productos</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                              {categoryProducts.filter(p => !p.subcategory_id).map(product => renderProductCard(product, null))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                        {categoryProducts.map(product => renderProductCard(product, null))}
                        
                        {categoryProducts.length === 0 && (
                          <div className="col-span-full py-4 text-center border border-dashed border-zinc-800 rounded-2xl text-gray-500 text-sm">
                            {t('no_products_in_category')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {renameModal.isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-display font-black text-white uppercase mb-4">Renombrar: {renameModal.oldSub}</h2>
            <p className="text-xs text-gray-400 mb-6">Esto actualizará el nombre de esta subcategoría en todos los productos que la tengan asignada. La App Pública se actualizará automáticamente.</p>
            
            <form onSubmit={handleRenameSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2">Nuevo Nombre (ES)</label>
                <input
                  type="text"
                  required
                  value={renameModal.newSub}
                  onChange={e => setRenameModal({...renameModal, newSub: e.target.value.toUpperCase()})}
                  className="w-full bg-[#1A1A24] border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Nuevo Nombre (EN)</label>
                <input
                  type="text"
                  required
                  value={renameModal.newSubEn}
                  onChange={e => setRenameModal({...renameModal, newSubEn: e.target.value.toUpperCase()})}
                  className="w-full bg-[#1A1A24] border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none uppercase"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setRenameModal({...renameModal, isOpen: false})} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-yellow-500/20">Renombrar a {renameModal.newSub}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModal.isOpen && (
        <AdminCategoryForm
          category={categoryModal.data}
          onClose={() => setCategoryModal({ isOpen: false })}
          onSuccess={() => {
            setCategoryModal({ isOpen: false });
            fetchData();
            showNotification(t('category_saved_success'), 'success');
          }}
        />
      )}

      {subcategoryModal.isOpen && (
        <AdminSubcategoryForm
          subcategory={subcategoryModal.data}
          categoryId={subcategoryModal.categoryId!}
          onClose={() => setSubcategoryModal({ isOpen: false })}
          onSuccess={() => {
            setSubcategoryModal({ isOpen: false });
            fetchData();
            showNotification('Subcategoría guardada con éxito', 'success');
          }}
        />
      )}

      {productModal.isOpen && (
        <AdminProductForm
          product={productModal.data}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setProductModal({ isOpen: false })}
          onSuccess={() => {
            setProductModal({ isOpen: false });
            fetchData();
            showNotification(t('product_saved_success'), 'success');
          }}
        />
      )}
    </div>
  );
}
