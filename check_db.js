import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  const { data: prods } = await supabase.from('products').select('*');
  const catSet = [...new Set(prods.map(p => p.category_id))];
  const subcatSet = [...new Set(prods.map(p => p.subcategory_id))];
  console.log("Categorias de productos:", catSet);
  console.log("Subcategorias de productos:", subcatSet);
  
  const { data: subcats } = await supabase.from('subcategories').select('*');
  console.log("Tabla subcategories:", subcats.map(s => ({id: s.id, name: s.name, category: s.category_id})));
})();
