const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jlchjamoejkzahaeimec.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs');

async function run() {
  // Let's just fetch recent orders to see their totals
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
run();
