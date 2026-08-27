import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data: p } = await supabase.from('products').select('name, name_en, description, description_en').limit(5);
  const { data: c } = await supabase.from('categories').select('name, name_en, description, description_en');
  console.log("Products:", p);
  console.log("Categories:", c);
}
check();
