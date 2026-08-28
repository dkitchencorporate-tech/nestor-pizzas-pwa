import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://jlchjamoejkzahaeimec.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0"
);

(async () => {
  // We need to use service_role key to bypass RLS for inserts/updates?
  // Wait, anon key might not have permission to insert into categories/subcategories if RLS is enabled!
  // Let's check if the anon key works.
  console.log("Checking DB...");
  const { data: prods, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("Error reading products:", error);
    return;
  }
  
  const bebidasToFix = prods.filter(p => ['AGUAS', 'CERVEZAS', 'REFRESCOS', 'REFRESCOS GRANDES', 'TINTOS'].includes(p.category_id));
  console.log("Bebidas found:", bebidasToFix.length);
})();
