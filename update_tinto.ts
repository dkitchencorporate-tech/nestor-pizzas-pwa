import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlchjamoejkzahaeimec.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.from('products')
    .update({ img_url: './assets/img/products/tinto.jpg' })
    .in('id', [107, 108]);
  console.log(error || 'Success');
}
run();
