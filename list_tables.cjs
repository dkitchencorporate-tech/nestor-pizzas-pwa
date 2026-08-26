const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jlchjamoejkzahaeimec.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs');

async function run() {
  const { data, error } = await supabase.from('store_status').select('*');
  console.log('store_status', data);
}
run();
