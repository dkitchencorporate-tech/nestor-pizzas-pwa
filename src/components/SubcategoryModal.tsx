import React, { useEffect } from 'react';
import { useI18nStore } from '../store/i18nStore';
import ProductCard from './ProductCard';

interface SubcategoryModalProps {
  productGroup: any;
  onClose: () => void;
}

export default function SubcategoryModal({ productGroup, onClose }: SubcategoryModalProps) {
  const { t, tDynamic, lang } = useI18nStore() as any;

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const displayName = lang === 'en' && productGroup.name_en ? productGroup.name_en : tDynamic(productGroup.name);
  const displayDesc = lang === 'en' && productGroup.description_en ? productGroup.description_en : tDynamic(productGroup.description);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111118] sm:rounded-3xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative animate-slide-up rounded-t-[2rem]">
        {/* Header */}
        <div className="sticky top-0 bg-[#111118] border-b border-zinc-800 p-5 rounded-t-[2rem] sm:rounded-t-3xl z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-wider">{displayName}</h2>
            {displayDesc && <p className="text-gray-400 text-sm">{displayDesc}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido (Subproductos) */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productGroup.subProducts.map((subProd: any) => (
              <ProductCard key={subProd.id} product={subProd} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
