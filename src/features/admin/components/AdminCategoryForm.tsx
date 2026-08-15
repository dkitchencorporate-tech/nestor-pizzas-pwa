import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface AdminCategoryFormProps {
  category?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminCategoryForm({ category, onClose, onSuccess }: AdminCategoryFormProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    subtitle: '',
    description: '',
    sort_order: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!category;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        id: category.id,
        name: category.name || '',
        subtitle: category.subtitle || '',
        description: category.description || '',
        sort_order: category.sort_order || 0,
      });
    }
  }, [category, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    
    // Si estamos creando y editamos el name, autocompletar el ID
    if (!isEditing && name === 'name') {
      setFormData(prev => ({
        ...prev,
        id: value.toUpperCase().trim()
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        // En edición, no actualizamos el ID porque es primary key y rompería relaciones
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            subtitle: formData.subtitle,
            description: formData.description,
            sort_order: formData.sort_order
          })
          .eq('id', category.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert([formData]);
          
        if (insertError) throw insertError;
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setError(err.message || 'Ocurrió un error al guardar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-white uppercase">
            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
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
          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ID (Identificador Único)</label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                required
                placeholder="EJ: NUESTRAS PIZZAS"
                className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors uppercase"
              />
              <p className="text-[10px] text-gray-500 mt-1">Este valor no se podrá cambiar después de crearlo.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre Público</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ej: Nuestras Pizzas"
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subtítulo (Opcional)</label>
            <input
              type="text"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              placeholder="Ej: 33 cm"
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Ej: Base de tomate natural..."
              className="w-full bg-[#1A1A24] border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
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
              {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
