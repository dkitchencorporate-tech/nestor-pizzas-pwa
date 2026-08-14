import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlchjamoejkzahaeimec.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function insertOrders(count, batchName) {
  console.log(`\n[${new Date().toLocaleTimeString()}] Insertando ${count} pedidos de golpe (${batchName})...`);
  const promises = [];
  
  for (let i = 1; i <= count; i++) {
    const orderPromise = supabase.from('orders').insert({
      total_amount: Math.floor(Math.random() * 40) + 10,
      status: 'pending',
      client_name: `${batchName} - Agente ${i}`,
      client_phone: `6000000${i.toString().padStart(2, '0')}`,
      delivery_address: `Calle Prueba ${i}, Caniles`,
      delivery_method: i % 2 === 0 ? 'delivery' : 'pickup'
    });
    
    promises.push(orderPromise);
  }
  
  await Promise.all(promises);
  console.log(`✓ ${count} pedidos inyectados con éxito.`);
}

async function runSimulation() {
  console.log('=== INICIANDO SIMULACIÓN DE ESTRÉS PARA TPV ===');
  console.log('Por favor, mantén la ventana de Vercel (Producción) abierta con el sonido activado.');
  
  // Fase 1: 2 pedidos
  await insertOrders(2, 'Fase 1');
  
  console.log('Esperando 40 segundos...');
  await sleep(40000);
  
  // Fase 2: 1 pedido
  await insertOrders(1, 'Fase 2');
  
  console.log('Esperando 30 segundos...');
  await sleep(30000);
  
  // Fase 3: 5 pedidos
  await insertOrders(5, 'Fase 3');
  
  console.log('\n=== SIMULACIÓN COMPLETADA ===');
}

runSimulation();
