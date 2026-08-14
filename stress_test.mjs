import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlchjamoejkzahaeimec.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function stressTest() {
  console.log('Starting stress test: Inserting 10 concurrent orders...');
  
  const promises = [];
  
  for (let i = 1; i <= 10; i++) {
    const orderPromise = supabase.from('orders').insert({
      total_amount: Math.floor(Math.random() * 50) + 15, // random between 15 and 65
      status: 'pending',
      client_name: `Agente de Prueba #${i}`,
      client_phone: `6000000${i.toString().padStart(2, '0')}`,
      delivery_address: `Calle Falsa ${i}, Caniles`,
      delivery_method: i % 2 === 0 ? 'delivery' : 'pickup'
    });
    
    promises.push(orderPromise);
  }
  
  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const endTime = Date.now();
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((res, index) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      successCount++;
    } else {
      failCount++;
      console.error(`Error in order ${index + 1}:`, res.status === 'fulfilled' ? res.value.error : res.reason);
    }
  });
  
  console.log(`\nStress Test Results:`);
  console.log(`Time taken: ${endTime - startTime}ms`);
  console.log(`Successful orders: ${successCount}`);
  console.log(`Failed orders: ${failCount}`);
}

stressTest();
