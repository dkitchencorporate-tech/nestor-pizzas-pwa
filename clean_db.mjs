import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlchjamoejkzahaeimec.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanDB() {
  console.log('Borrando pedidos de prueba...');
  
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .like('client_name', '%Agente%');
    
  if (error) {
    console.error('Error al borrar (Agente):', error);
  } else {
    console.log('Borrados pedidos de Agente.');
  }

  const { data2, error2 } = await supabase
    .from('orders')
    .delete()
    .like('client_name', '%Fase%');
    
  if (error2) {
    console.error('Error al borrar (Fase):', error2);
  } else {
    console.log('Borrados pedidos de Fase.');
  }
}

cleanDB();
