import { createClient } from '@supabase/supabase-js';
import { NESTOR_PRODUCTS, NESTOR_CATEGORIES } from '../data/products';

const supabaseUrl = 'https://jlchjamoejkzahaeimec.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateProducts() {
  console.log('--- Migrando Categorías ---');
  for (const cat of NESTOR_CATEGORIES) {
    const { error } = await supabase.from('categories').upsert({
      id: cat.id,
      name: cat.name,
      subtitle: cat.subtitle,
      description: cat.desc,
      sort_order: NESTOR_CATEGORIES.indexOf(cat) + 1
    }, { onConflict: 'id' });
    
    if (error) console.error('Error insertando categoría', cat.name, error);
    else console.log('Categoría OK:', cat.name);
  }

  console.log('--- Migrando Productos ---');
  let successCount = 0;
  
  for (const p of NESTOR_PRODUCTS) {
    const { error } = await supabase.from('products').upsert({
      id: p.id,
      category_id: p.category,
      name: p.name,
      description_en: (p as any).description,
      price: p.price,
      badge: p.badge,
      img_url: p.img,
      is_active: true
    }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error insertando producto:', p.name, error.message);
    } else {
      successCount++;
    }
  }
  
  console.log(`--- Productos migrados: ${successCount} ---`);
}

migrateProducts();
