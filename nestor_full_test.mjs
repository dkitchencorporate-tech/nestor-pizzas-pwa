import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlchjamoejkzahaeimec.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0';

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PASS = (msg) => console.log(`  PASS: ${msg}`);
const FAIL = (msg) => console.log(`  FAIL: ${msg}`);
const INFO = (msg) => console.log(`  INFO: ${msg}`);
const SECTION = (msg) => console.log(`\n${'='.repeat(60)}\n>> ${msg}\n${'='.repeat(60)}`);

async function runSecurityTests() {
  SECTION('MODULO 1 - ATAQUES DE SEGURIDAD');

  console.log('\n[A1] IDOR: Leyendo pedidos de invitados...');
  const { data: guestOrders, error: guestErr } = await supabase
    .from('orders').select('client_name,client_phone,delivery_address').is('user_id', null);
  if (!guestErr && guestOrders && guestOrders.length > 0) {
    FAIL(`IDOR ACTIVO - ${guestOrders.length} pedidos expuestos: ${JSON.stringify(guestOrders[0])}`);
  } else {
    PASS(`IDOR BLOQUEADO - ${guestErr?.message || '0 registros devueltos'}`);
  }

  console.log('\n[A2] Lectura masiva de todos los pedidos...');
  const { data: allOrders, error: allErr } = await supabase.from('orders').select('*').limit(5);
  if (!allErr && allOrders && allOrders.length > 0) {
    FAIL(`EXPOSICION - ${allOrders.length} pedidos devueltos sin auth`);
  } else {
    PASS(`Lectura masiva BLOQUEADA - ${allErr?.message || '0 registros'}`);
  }

  console.log('\n[A3] Lectura de tabla profiles...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles').select('id,full_name,email,phone,is_admin,points');
  if (!profErr && profiles && profiles.length > 0) {
    FAIL(`PERFILES EXPUESTOS - ${profiles.length} usuarios visibles`);
  } else {
    PASS(`Profiles PROTEGIDOS - ${profErr?.message || '0 registros'}`);
  }

  console.log('\n[A4] Price Manipulation: order a 0.01...');
  const { data: cheapOrder, error: cheapErr } = await supabase.rpc('process_checkout', {
    p_user_id: null, p_client_name: 'ATTACKER', p_client_phone: '000000001',
    p_delivery_address: 'Attack', p_delivery_method: 'pickup',
    p_items: [{ product_id: 1, quantity: 1, unit_price: 0.01, customization_details: { name: 'Hack' } }],
    p_points_redeemed: false, p_small_order_fee_accepted: false, p_ip_address: 'attack_a4'
  });
  if (!cheapErr && cheapOrder) {
    FAIL(`PRECIO MANIPULADO ACEPTADO a 0.01. ID: ${cheapOrder}`);
  } else {
    PASS(`Price manipulation BLOQUEADA: ${cheapErr?.message}`);
  }

  console.log('\n[A5] Null product_id con precio 500...');
  const { data: nullOrder, error: nullErr } = await supabase.rpc('process_checkout', {
    p_user_id: null, p_client_name: 'HACKER', p_client_phone: '000000002',
    p_delivery_address: 'Nowhere', p_delivery_method: 'pickup',
    p_items: [{ product_id: null, quantity: 1, unit_price: 500, customization_details: { name: 'FREE' } }],
    p_points_redeemed: false, p_small_order_fee_accepted: false, p_ip_address: 'attack_a5'
  });
  if (!nullErr && nullOrder) {
    FAIL(`NULL-ID BYPASS - order a 500 creada. ID: ${nullOrder}`);
  } else {
    PASS(`Null product_id BLOQUEADO: ${nullErr?.message}`);
  }

  console.log('\n[A6] Privilege escalation via profile update...');
  const { status: escStatus, error: escErr } = await supabase
    .from('profiles').update({ is_admin: true, points: 99999 })
    .eq('id', '00000000-0000-0000-0000-000000000000');
  if (escStatus === 200) {
    FAIL(`ESCALADA EXITOSA - is_admin actualizado`);
  } else {
    PASS(`Escalada BLOQUEADA - status ${escStatus}: ${escErr?.message || 'no rows affected'}`);
  }

  console.log('\n[A7] Rate Limiting: 13 peticiones de la misma IP...');
  const FIXED_IP = 'rate_limit_stress_' + Date.now();
  const rateResults = await Promise.all(Array(13).fill(null).map((_, i) =>
    supabase.rpc('process_checkout', {
      p_user_id: null, p_client_name: `RateTest_${i}`, p_client_phone: '999999999',
      p_delivery_address: null, p_delivery_method: 'pickup',
      p_items: [{ product_id: null, quantity: 1, unit_price: 10, customization_details: { name: 'Rate' } }],
      p_points_redeemed: false, p_small_order_fee_accepted: true, p_ip_address: FIXED_IP
    }).then(r => ({ ok: !r.error, error: r.error?.message }))
  ));
  const blocked = rateResults.filter(r => r.error?.includes('Demasiados'));
  const accepted = rateResults.filter(r => r.ok);
  INFO(`Aceptados: ${accepted.length}/13 | Bloqueados: ${blocked.length}/13`);
  if (blocked.length > 0) {
    PASS(`Rate limiting ACTIVO - ${blocked.length} bloqueados`);
  } else {
    FAIL(`Rate limiting SIN EFECTO - 13 peticiones aceptadas. Revisar IP en RPC.`);
  }
}

async function runLoadTest() {
  SECTION('MODULO 2 - CARGA: 30 PEDIDOS CONCURRENTES');
  
  const names = ['Ana Garcia','Carlos Lopez','Maria Perez','Juan Martinez','Laura Sanchez',
                 'Pedro Ruiz','Sofia Moreno','Diego Torres','Carmen Vega','Luis Ramos'];
  const items = [
    { name: 'Margarita', price: 10 },
    { name: 'Napolitana', price: 11 },
    { name: 'Barbacoa', price: 12 },
    { name: 'Cuatro Quesos', price: 13 },
    { name: 'Vegetal', price: 10.5 },
  ];

  console.log('\nInsertando 30 pedidos simultaneos via RPC...');
  const start = Date.now();
  
  const results = await Promise.all(Array(30).fill(null).map((_, i) => {
    const item = items[i % items.length];
    const name = names[i % names.length];
    const method = i % 3 === 0 ? 'delivery' : 'pickup';
    return supabase.rpc('process_checkout', {
      p_user_id: null,
      p_client_name: `${name} ST${i + 1}`,
      p_client_phone: `60000${String(i).padStart(5, '0')}`,
      p_delivery_address: method === 'delivery' ? `Calle Test ${i}, Caniles, 18810` : null,
      p_delivery_method: method,
      p_items: [{ product_id: null, quantity: 1, unit_price: item.price, customization_details: { name: item.name } }],
      p_points_redeemed: false,
      p_small_order_fee_accepted: true,
      p_ip_address: `stress_ip_${(i % 8) + 1}`
    }).then(r => ({ i: i+1, ok: !r.error, id: r.data, err: r.error?.message }));
  }));

  const elapsed = Date.now() - start;
  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const rateLimited = fail.filter(r => r.err?.includes('Demasiados'));

  INFO(`Tiempo: ${elapsed}ms`);
  INFO(`Exitosos: ${ok.length}/30`);
  INFO(`Fallidos: ${fail.length}/30`);
  if (rateLimited.length > 0) INFO(`Rate limited: ${rateLimited.length} (IPs compartidas, esperado)`);
  
  if (ok.length >= 20) {
    PASS(`Carga OK - ${ok.length}/30 pedidos procesados en ${elapsed}ms`);
  } else {
    FAIL(`Alta tasa de error - solo ${ok.length}/30 exitosos`);
  }
  if (fail.length > 0) {
    INFO(`Errores unicos: ${[...new Set(fail.map(f => f.err))].join(' | ')}`);
  }
}

async function runIntegrityTests() {
  SECTION('MODULO 3 - INTEGRIDAD Y RLS');

  console.log('\n[I1] Catalogo de productos...');
  const { data: prods, error: pe } = await supabase
    .from('products').select('id,name,price,is_active').eq('is_active', true);
  if (!pe && prods?.length > 0) {
    PASS(`Catalogo: ${prods.length} productos activos`);
    const zeroPriced = prods.filter(p => !p.price || p.price <= 0);
    if (zeroPriced.length > 0) FAIL(`${zeroPriced.length} productos con precio 0: ${zeroPriced.map(p=>p.name).join(', ')}`);
    else PASS(`Todos los precios son validos > 0`);
  } else {
    FAIL(`No se pudo leer catalogo: ${pe?.message}`);
  }

  console.log('\n[I2] Tabla rate_limits...');
  const { error: rle } = await supabase.from('rate_limits').select('*').limit(1);
  if (rle?.message?.includes('does not exist')) {
    FAIL(`rate_limits NO EXISTE - rate limiting sin efecto`);
  } else {
    PASS(`rate_limits EXISTE (${rle?.message || 'accesible'})`);
  }

  console.log('\n[I3] Upsells activos...');
  const { data: ups, error: ue } = await supabase
    .from('upsell_suggestions').select('*').eq('is_active', true);
  if (!ue && ups?.length > 0) PASS(`${ups.length} upsells activos`);
  else if (!ue && ups?.length === 0) INFO(`Sin upsells activos - modal no mostrara sugerencias`);
  else INFO(`Upsells: ${ue?.message}`);

  console.log('\n[I4] Conteo de pedidos stress en BD...');
  const { count, error: ce } = await supabase
    .from('orders').select('*', { count: 'exact', head: true }).ilike('client_name', '% ST%');
  if (!ce) INFO(`Pedidos de stress en BD: ${count}`);
}

async function runPerformanceTests() {
  SECTION('MODULO 4 - RENDIMIENTO');

  console.log('\n[P1] Latencia catalogo...');
  const t1 = Date.now();
  await supabase.from('products').select('*').eq('is_active', true);
  const cl = Date.now() - t1;
  if (cl < 500) PASS(`Catalogo: ${cl}ms (EXCELENTE)`);
  else if (cl < 1500) INFO(`Catalogo: ${cl}ms (ACEPTABLE)`);
  else FAIL(`Catalogo: ${cl}ms (LENTO)`);

  console.log('\n[P2] Latencia checkout RPC...');
  const t2 = Date.now();
  await supabase.rpc('process_checkout', {
    p_user_id: null, p_client_name: 'Perf', p_client_phone: '611111111',
    p_delivery_address: null, p_delivery_method: 'pickup',
    p_items: [{ product_id: null, quantity: 1, unit_price: 10, customization_details: { name: 'Perf' } }],
    p_points_redeemed: false, p_small_order_fee_accepted: true, p_ip_address: 'perf_solo_unique'
  });
  const rl = Date.now() - t2;
  if (rl < 1000) PASS(`Checkout RPC: ${rl}ms (EXCELENTE)`);
  else if (rl < 3000) INFO(`Checkout RPC: ${rl}ms (ACEPTABLE)`);
  else FAIL(`Checkout RPC: ${rl}ms (LENTO)`);

  console.log('\n[P3] 5 lecturas concurrentes...');
  const t3 = Date.now();
  await Promise.all(Array(5).fill(null).map(() =>
    supabase.from('products').select('id,name,price').eq('is_active', true)
  ));
  const concl = Date.now() - t3;
  PASS(`5 lecturas concurrentes: ${concl}ms total (${Math.round(concl/5)}ms/req)`);
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  NESTOR PIZZAS - STRESS & SECURITY TEST SUITE');
  console.log(`  ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  await runSecurityTests();
  await sleep(200);
  await runLoadTest();
  await sleep(200);
  await runIntegrityTests();
  await sleep(200);
  await runPerformanceTests();
  console.log('\n' + '='.repeat(60));
  console.log('  SUITE COMPLETADA');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
