import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('search_client', { p_query: '611' });
  console.log('DATA:', data);
  if (error) {
    console.error('ERROR:', error);
  }
}

run();
