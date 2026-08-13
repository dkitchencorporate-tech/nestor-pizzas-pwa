import Header from '../../components/Header';
import Hero from '../../components/Hero';
import ProductCard from '../../components/ProductCard';
import IngredientsModal from '../../components/IngredientsModal';
import { useState, useEffect } from 'react';
import { NESTOR_INGREDIENTS_OFICIAL } from '../../data/products';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';

export default function Catalog() {
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [ingredientsProduct, setIngredientsProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaturationMode, setIsSaturationMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_active', true)
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (prodsRes.data) setProducts(prodsRes.data);
      setIsLoading(false);
      
      // Fetch initial saturation mode
      const { data: settings } = await supabase.from('app_settings').select('*').eq('key', 'saturation_mode').single();
      if (settings && settings.value === 'true') {
        setIsSaturationMode(true);
      }
    };
    fetchData();

    // Subscribe to realtime products changes (Kill-Switch)
    const productsChannel = supabase.channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        if (payload.eventType === 'UPDATE') {
          const updatedProduct = payload.new as any;
          setProducts(prev => {
            if (!updatedProduct.is_active) {
              return prev.filter(p => p.id !== updatedProduct.id);
            } else {
              const exists = prev.find(p => p.id === updatedProduct.id);
              if (exists) return prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
              return [...prev, updatedProduct];
            }
          });
        }
      })
      .subscribe();

    // Subscribe to realtime settings changes (Saturation Mode)
    const settingsChannel = supabase.channel('public:app_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: "key=eq.saturation_mode" }, payload => {
        const newValue = payload.new as any;
        setIsSaturationMode(newValue.value === 'true');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // Lógica Temporal (OVERRIDE MODO DEV: TRUE)
  const isWeekend = true;
  const isSecretBurguerDay = true;

  // Categorías a mostrar (filtrando por lógica temporal si la hubiera)
  const displayCategories = ['TODOS', ...categories
    .filter(cat => {
      if (cat.name === 'SECRET BURGUER' && !isSecretBurguerDay) return false;
      if (cat.name === 'ALGO MÁS' && !isWeekend) return false;
      return true;
    })
    .map(c => c.name)];

  // Categorías a renderizar en la vista principal
  const categoriesToRender = activeCategory === 'TODOS'
    ? categories
    : categories.filter(c => c.name === activeCategory);

  let isFirst = true;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Hero />
      
      {isSaturationMode && (
        <div className="bg-red-600 text-white font-bold text-center py-2 px-4 animate-pulse uppercase tracking-wider text-sm sticky top-[52px] sm:top-[60px] z-[45]">
          ⚠️ MODO SATURACIÓN ACTIVO: Los pedidos tardarán más de 1 hora. Disculpen las molestias.
        </div>
      )}

      {/* Category Nav */}
      <div className="sticky top-[68px] sm:top-[76px] z-40 w-full flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all mt-6">
        <nav className="bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-zinc-800 py-4 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-start xl:justify-center gap-2.5 sm:gap-3 text-sm sm:text-sm font-display font-extrabold uppercase tracking-wider min-w-max px-2 py-1">
              {displayCategories.map(cat => {
                const isActive = activeCategory === cat;
                
                // Calcular el conteo real
                let count = 0;
                if (cat === 'TODOS') {
                  count = products.filter(p => {
                    if (p.category_id === 'SECRET BURGUER' && !isSecretBurguerDay) return false;
                    if (p.category_id === 'ALGO MÁS' && !isWeekend) return false;
                    return true;
                  }).length;
                } else {
                  count = products.filter(p => p.category_id === cat || p.category === cat).length; // Check both id and name for safety
                }

                return (
                  <button 
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      window.scrollTo({ top: 480, behavior: 'smooth' });
                    }}
                    className={isActive 
                      ? 'category-pill active px-5 py-2.5 rounded-2xl bg-green-500 text-white font-extrabold border border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.6)] whitespace-nowrap shrink-0'
                      : 'category-pill px-5 py-2.5 rounded-2xl bg-[#14141E] text-gray-300 hover:text-white border border-zinc-700 hover:border-green-400 whitespace-nowrap shrink-0 transition-all'
                    }
                  >
                    {cat === 'TODOS' ? 'MENÚ COMPLETO' : cat} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
        
        {/* Marquee Ticker */}
        <div className="w-full bg-[#1A1A24] border-b border-green-500/20 overflow-hidden relative flex items-center py-2 shadow-inner">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1A1A24] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1A1A24] to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex whitespace-nowrap animate-marquee items-center">
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">🔥</span> OFERTA FLASH: Instala la App hoy y llévate una ración de PATATAS GRATIS en tu primer pedido
              </span>
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-green-500 uppercase tracking-wide flex items-center gap-2">
                  ⏱️ LA OFERTA TERMINA EN: <span className="font-black text-white bg-black px-2 py-0.5 rounded border border-green-500/50">05:43:21</span>
              </span>
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-red-500 text-sm">⚡</span> ¡GANA UNA PIZZA! Regístrate, compártelo con 5 amigos y tu próxima pizza te sale GRATIS (pedidos &gt;15€)
              </span>
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-green-500 uppercase tracking-wide flex items-center gap-2">
                  ⏱️ LA OFERTA TERMINA EN: <span className="font-black text-white bg-black px-2 py-0.5 rounded border border-green-500/50">05:43:21</span>
              </span>
              {/* Duplicate for infinite scroll loop */}
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">🔥</span> OFERTA FLASH: Instala la App hoy y llévate una ración de PATATAS GRATIS en tu primer pedido
              </span>
              <span className="mx-8 text-[11px] sm:text-sm font-bold text-green-500 uppercase tracking-wide flex items-center gap-2">
                  ⏱️ LA OFERTA TERMINA EN: <span className="font-black text-white bg-black px-2 py-0.5 rounded border border-green-500/50">05:43:21</span>
              </span>
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 25s linear infinite;
          }
        `}</style>
      </div>

      {/* Grid Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-32 min-h-screen space-y-12">
        {categoriesToRender.map(cat => {
          let catProducts = products.filter(p => p.category_id === cat.id || p.category === cat.id);
          
          // Ocultar productos si la categoría está inactiva por fecha (aunque por ahora está en TRUE)
          if (cat.name === 'SECRET BURGUER' && !isSecretBurguerDay) return null;
          if (cat.name === 'ALGO MÁS' && !isWeekend) return null;
          
          if (catProducts.length === 0 && cat.id !== 'POR INGREDIENTES') return null;

          const renderIngredients = isFirst && (activeCategory === 'TODOS' || activeCategory === 'NUESTRAS PIZZAS');
          isFirst = false;

          return (
            <div key={cat.id} className="w-full">
              
              {/* Tarjeta de Ingredientes (Antes de la primera sección) */}
              {renderIngredients && (
                <div className="mb-10">
                  <div className="relative overflow-hidden rounded-3xl border border-green-500/30 bg-gradient-to-br from-[#0D0D12] via-[#111118] to-[#0A0A0E] shadow-2xl p-6 sm:p-8">
                    {/* Glow decorativo */}
                    <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-green-500/5 blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-500/5 blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 space-y-5">
                      {/* Título sutil */}
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-green-500"></div>
                        <div>
                          <span className="text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest">NUESTROS INGREDIENTES</span>
                          <p className="text-white font-display font-black text-base sm:text-lg uppercase tracking-wide leading-none mt-0.5">Carta oficial de toppings disponibles</p>
                        </div>
                      </div>

                      {/* Grid de ingredientes */}
                      <div className="flex flex-wrap gap-2">
                        {NESTOR_INGREDIENTS_OFICIAL.map(ing => (
                          <span key={ing} className="inline-flex items-center gap-1.5 bg-[#1A1A24] border border-zinc-700/70 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-green-500/50 hover:text-white transition-colors cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0"></span>
                            {ing}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-zinc-500 font-medium">
                        Disponibles para pizzas al gusto y Mazzi Pizzas — pregunta disponibilidad de extras
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Encabezado de Categoría */}
              <div className="py-10 my-2 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span className="text-green-400 font-mono font-bold text-[11px] uppercase tracking-widest">{catProducts.length} VARIEDADES</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-none">
                    {cat.name}
                  </h2>
                  {cat.subtitle && (
                    <span className="text-green-400 font-mono text-sm font-bold">{cat.subtitle}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed pt-1">{cat.desc}</p>
                <div className="w-16 h-0.5 bg-green-500/50 mx-auto mt-4 rounded-full"></div>
              </div>

              {/* Grid de Productos de esta Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {catProducts.map(product => {
                  return <ProductCard key={product.id} product={product} onCustomize={(prod) => setIngredientsProduct(prod)} />
                })}
              </div>
            </div>
          );
        })}
      </main>

      {ingredientsProduct && (
        <IngredientsModal product={ingredientsProduct} onClose={() => setIngredientsProduct(null)} />
      )}
    </>
  );
}
