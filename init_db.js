const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Nunca hardcodear la cadena de conexión aquí. Exporta NESTOR_DB_URL en tu shell
// local antes de ejecutar este script (ver credenciales locales en el Escritorio).
const connectionString = process.env.NESTOR_DB_URL;
if (!connectionString) {
  console.error('Falta NESTOR_DB_URL en el entorno. Exporta la variable antes de ejecutar este script.');
  process.exit(1);
}

async function initDB() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');
    
    const sqlPath = path.join(__dirname, 'supabase-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(sql);
    console.log('Schema executed successfully.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

initDB();
