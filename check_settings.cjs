const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jlchjamoejkzahaeimec.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs');

async function run() {
  const { data, error } = await supabase.from('store_settings').select('*');
  console.log('store_settings:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('settings').select('*');
  console.log('settings:', d2, e2);
}
run();
