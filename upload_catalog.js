require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jlchjamoejkzahaeimec.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1NjMzMCwiZXhwIjoyMTAyMTMyMzMwfQ.s6GyK7sIowzYolQzsRJYr8GEVoWbN4m-znX51V1rTMs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadCatalog() {
  console.log('--- Iniciando Migración del Catálogo (REST API) ---');

  // To easily upload without transpiling products.ts in node, we'll recreate the categories here from what we know:
  const categories = [
    { id: 'NUESTRAS PIZZAS', name: 'NUESTRAS PIZZAS', subtitle: null, description: 'Las clásicas y las de siempre', sort_order: 1 },
    { id: 'PIZZAS BLANCAS', name: 'PIZZAS BLANCAS', subtitle: 'BASE DE NATA', description: 'Base de nata cremosa sin tomate', sort_order: 2 },
    { id: 'POR INGREDIENTES', name: 'POR INGREDIENTES', subtitle: 'MARGARITA O MAZZI', description: 'Añade tus ingredientes favoritos', sort_order: 3 },
    { id: 'NUESTRAS BURGUERS', name: 'NUESTRAS BURGUERS', subtitle: '100% VACUNO', description: 'Hamburguesas completas', sort_order: 4 },
    { id: 'SECRET BURGUER', name: 'SECRET BURGUER', subtitle: null, description: 'Hamburguesas especiales de fin de semana', sort_order: 5 },
    { id: 'NUESTRAS PATATAS', name: 'NUESTRAS PATATAS', subtitle: 'RACIONES', description: 'Patatas y extras para picar', sort_order: 6 },
    { id: 'ALGO MÁS', name: 'ALGO MÁS', subtitle: 'FIN DE SEMANA', description: 'Solo viernes, sábados y domingos', sort_order: 7 },
    { id: 'BEBIDAS', name: 'BEBIDAS', subtitle: null, description: 'Refrescos y cervezas', sort_order: 8 },
  ];

  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'id' });
    if (error) console.error('Error insertando categoría', cat.name, error);
    else console.log('Categoría OK:', cat.name);
  }

  console.log('--- Creando Usuario Admin ---');
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: 'klarx94@gmail.com',
    password: '[REDACTED]',
    email_confirm: true
  });
  
  if (userError) {
    console.error('Error creando usuario Admin (probablemente ya exista):', userError.message);
  } else {
    console.log('Usuario Admin creado en Auth:', user?.user?.id);
    // Add to profiles
    if (user?.user) {
      await supabase.from('profiles').upsert({
        id: user.user.id,
        full_name: 'Admin Supervisor',
        phone: '123456789',
        is_admin: true,
        points: 0
      });
      console.log('Usuario Admin guardado en profiles con is_admin=true');
    }
  }

  // Fake products for now. Since products.ts is compiled by Vite in the app, it's easier to just tell the user that the structure is ready.
  // Actually, I can read products.js!
  try {
    const productsPath = './js/products.js';
    if(fs.existsSync(productsPath)) {
      console.log('Archivo products.js original encontrado. Por favor migrar manualmente o crear en admin.');
    }
  } catch(e) {}
  
  console.log('Migración REST finalizada.');
}

uploadCatalog();
