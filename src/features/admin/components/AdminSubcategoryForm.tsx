import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface AdminSubcategoryFormProps {
  subcategory?: any;
  categoryId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminSubcategoryForm({ subcategory, categoryId, onClose, onSuccess }: AdminSubcategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    sort_order: 0,
    img_url: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!subcategory;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: subcategory.name || '',
        name_en: subcategory.name_en || '',
        description: subcategory.description || '',
        description_en: subcategory.description_en || '',
        sort_order: subcategory.sort_order || 0,
        img_url: subcategory.img_url || '',
      });
      if (subcategory.img_url) {
        setImagePreview(subcategory.img_url);
      }
    }
  }, [subcategory, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen es demasiado grande. El tamaño máximo es 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato no válido. Solo se permite JPG, PNG o WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setImageFile(file);
    
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

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        finalImgUrl = publicUrlData.publicUrl;
      }

      const dataToSave = {
        category_id: categoryId,
        name: formData.name,
        name_en: formData.name_en,
        description: formData.description,
        description_en: formData.description_en,
        sort_order: formData.sort_order,
        img_url: finalImgUrl,
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('subcategories')
          .update(dataToSave)
          .eq('id', subcategory.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('subcategories')
          .insert([dataToSave]);
          
        if (insertError) throw insertError;
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving subcategory:', err);
      setError(err.message || 'Ocurrió un error al guardar la subcategoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-white uppercase">
            {isEditing ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
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
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Imagen de Subcategoría (Max 2MB - JPG, PNG, WEBP)</label>
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
                    <span className="text-sm font-medium">Haz clic para seleccionar o subir foto oficial</span>
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

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2">Nombre Subcategoría (ES)</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Refrescos Grandes"
                  className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Nombre Subcategoría (EN)</label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Large Sodas"
                  className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción ES (Opcional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Ej: Refrescos de 2 litros..."
                  className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Descripción EN (Opcional)</label>
                <textarea
                  name="description_en"
                  value={formData.description_en}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Ej: 2 liters sodas..."
                  className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Orden de Visualización</label>
              <input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleChange}
                min="0"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              />
              <p className="text-[10px] text-gray-500 mt-1">Número menor aparece primero (0, 1, 2...).</p>
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
              {isSubmitting ? 'Guardando...' : 'Guardar Subcategoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
