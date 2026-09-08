import { supabase } from './supabase';

// Precarga del catálogo (categorías, subcategorías, productos) para que arranque
// EN PARALELO con el preloader/splash, no después de que termine. App.tsx llama a
// preloadCatalogData() en cuanto monta; Catalog.tsx usa el resultado ya listo (o la
// misma promesa en curso) en vez de repetir las consultas desde cero.
type CatalogData = {
  categories: any[];
  subcategories: any[];
  products: any[];
};

let cachedData: CatalogData | null = null;
let inflightPromise: Promise<CatalogData> | null = null;

export function preloadCatalogData(): Promise<CatalogData> {
  if (cachedData) return Promise.resolve(cachedData);
  if (inflightPromise) return inflightPromise;

  inflightPromise = Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('subcategories').select('*').order('sort_order'),
    supabase.from('products').select('*').eq('is_active', true)
  ]).then(([catsRes, subcatsRes, prodsRes]) => {
    cachedData = {
      categories: catsRes.data || [],
      subcategories: subcatsRes.data || [],
      products: prodsRes.data || []
    };
    return cachedData;
  });

  return inflightPromise;
}

export function getCachedCatalogData(): CatalogData | null {
  return cachedData;
}
