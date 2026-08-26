const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jlchjamoejkzahaeimec.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs');

async function run() {
  const { data, error } = await supabase.rpc('get_function_def', { func_name: 'process_checkout' });
  if (error) {
     console.log("Fallback fetching via pg_proc...");
     const sql = `
       SELECT prosrc 
       FROM pg_proc 
       WHERE proname = 'process_checkout';
     `;
     // Usually we can't run raw SQL from client, let's see if we can just read from information_schema if there's a view, probably not.
  } else {
     console.log(data);
  }
}
run();
