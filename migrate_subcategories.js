import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrateSubcategories() {
  console.log("Starting subcategory migration...");

  // 1. Fetch all products
  const { data: products, error: prodsErr } = await supabase.from('products').select('*');
  if (prodsErr) {
    console.error("Error fetching products:", prodsErr);
    return;
  }

  // 2. Identify unique subcategory strings
  const subcatsMap = new Map();
  for (const p of products) {
    if (p.subcategory) {
      const key = `${p.category_id}_${p.subcategory}`;
      if (!subcatsMap.has(key)) {
        subcatsMap.set(key, {
          category_id: p.category_id,
          name: p.subcategory.toUpperCase(),
          name_en: (p.subcategory_en || p.subcategory).toUpperCase(),
          img_url: p.img_url, // take the image of the first product
        });
      }
    }
  }

  // 3. Insert into subcategories table
  for (const [key, sub] of subcatsMap.entries()) {
    console.log("Creating subcategory:", sub.name);
    const { data: newSub, error: insErr } = await supabase
      .from('subcategories')
      .insert([sub])
      .select()
      .single();

    if (insErr) {
      console.error("Error inserting subcategory:", insErr);
      continue;
    }

    // 4. Update products to link to this new subcategory
    console.log(`Updating products for ${sub.name}...`);
    const { error: upErr } = await supabase
      .from('products')
      .update({ subcategory_id: newSub.id })
      .eq('category_id', sub.category_id)
      .eq('subcategory', sub.name);

    if (upErr) {
      console.error("Error updating products:", upErr);
    }
  }

  console.log("Migration complete.");
}

migrateSubcategories();
