import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

// Read .env directly
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const extractEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}="(.*?)"`));
  return match ? match[1] : null;
};

const supabaseUrl = extractEnv('VITE_SUPABASE_URL');
// Note: We need the service_role key to update rows without RLS blocking us, 
// OR we can just use the anon key if RLS allows anon to update (unlikely).
// But wait, the anon key is the only one in .env? Let's check.
const supabaseKey = extractEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log("Checking subcategories...");
  const { data: subcats, error: selError } = await supabase.from('subcategories').select('*');
  
  if (selError) {
    console.error("Error reading subcategories:", selError);
    return;
  }
  
  const typoSubcat = subcats.find(s => s.name === 'REFESCOS GRANDES');
  
  if (typoSubcat) {
    console.log(`Found typo in subcategory ID: ${typoSubcat.id}`);
    
    // We update name to REFRESCOS GRANDES
    // But since RLS might block anon updates, let's see. 
    // Wait, AdminCatalog allows anon updates? No, RLS policy for subcategories:
    // CREATE POLICY "Admin write access for subcategories" ON public.subcategories FOR ALL TO authenticated USING (true) WITH CHECK (true);
    // So anon cannot update it!
    
    // So we can't update using anon key. We need to use SQL via Supabase Dashboard, or the user can run it.
    // Wait! Can I use curl with the auth endpoint? I don't have user's password.
    
    // Wait! Let me check if RLS allows anon to update if I use the anon key.
    const { data, error } = await supabase.from('subcategories')
      .update({ name: 'REFRESCOS GRANDES', name_en: 'LARGE SOFT DRINKS' })
      .eq('id', typoSubcat.id)
      .select();
      
    if (error) {
      console.error("Error updating subcategory:", error);
    } else {
      console.log("Subcategory updated successfully:", data);
    }
  } else {
    console.log("No subcategory found with name 'REFESCOS GRANDES'");
  }
})();
