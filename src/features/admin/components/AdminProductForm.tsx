import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface AdminProductFormProps {
  product?: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminProductForm({ product, categories, onClose, onSuccess }: AdminProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: categories.length > 0 ? categories[0].id : '',
    subcategory: '',
    badge: '',
    img_url: '',
    is_active: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!product;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
        subcategory: product.subcategory || '',
        badge: product.badge || '',
        img_url: product.img_url || '',
        is_active: product.is_active !== false,
      });
      if (product.img_url) {
        setImagePreview(product.img_url);
      }
    }
  }, [product, isEditing, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tamaño (2MB máx)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen es demasiado grande. El tamaño máximo es 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validación de formato
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato no válido. Solo se permite JPG, PNG o WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setImageFile(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let finalImgUrl = formData.img_url;

      // Si el usuario subió una imagen nueva, subirla a Supabase Storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Obtener la URL pública de la imagen
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        finalImgUrl = publicUrlData.publicUrl;
      }

      const dataToSave = {
        ...formData,
        img_url: finalImgUrl,
        // Limpiar subcategoría si la categoría no es BEBIDAS
        subcategory: isBebidasCategory ? formData.subcategory : null
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('products')
          .update(dataToSave)
          .eq('id', product.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([dataToSave]);
          
        if (insertError) throw insertError;
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Ocurrió un error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificar si la categoría seleccionada es BEBIDAS
  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const isBebidasCategory = selectedCategory?.name?.toUpperCase() === 'BEBIDAS';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-white uppercase">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Image Upload Box */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Imagen del Producto (Max 2MB - JPG, PNG, WEBP)</label>
              <div 
                className="w-full bg-[#1A1A24] border-2 border-dashed border-zinc-700 hover:border-green-500 rounded-xl p-4 text-center cursor-pointer transition-colors relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative w-full h-40">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">Cambiar Imagen</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-sm font-medium">Haz clic para seleccionar o subir foto</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Producto</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Pizza Margarita"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Precio (€)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Ej: 9.50"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {isBebidasCategory && (
              <div className="md:col-span-2 p-4 bg-zinc-800/30 border border-zinc-700 rounded-xl">
                <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2">
                  Subcategoría de Bebida
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={formData.subcategory || ''}
                  onChange={handleChange}
                  placeholder="Ej: CERVEZAS, REFRESCOS, AGUAS"
                  className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  Agrupará esta bebida bajo esta sección dentro de la pestaña BEBIDAS.
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción (Ingredientes)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Ej: Tomate, mozzarella y albahaca fresca"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Etiqueta (Badge / Opcional)</label>
              <input
                type="text"
                name="badge"
                value={formData.badge}
                onChange={handleChange}
                placeholder="Ej: NUEVO, PICANTE"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors uppercase"
              />
            </div>
            
            <div className="md:col-span-2 flex items-center mt-2 bg-[#1A1A24] p-4 rounded-xl border border-zinc-700/50">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded border-zinc-600 text-green-500 focus:ring-green-500 focus:ring-offset-zinc-900 bg-zinc-800"
              />
              <label htmlFor="is_active" className="ml-3 text-sm font-medium text-white cursor-pointer">
                Producto Activo (Visible en la carta)
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-2xl font-bold bg-green-500 text-black hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
