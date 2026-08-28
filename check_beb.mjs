import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://jlchjamoejkzahaeimec.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0"
);

(async () => {
  const { data: prods } = await supabase.from('products').select('name, category_id, subcategory_id');
  const bebidas = prods.filter(p => p.category_id === 'BEBIDAS');
  console.log("Total BEBIDAS:", bebidas.length);
  if (bebidas.length > 0) {
    console.log(bebidas.slice(0, 5));
  }
})();
