const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:[REDACTED-ROTATE-BEFORE-GOING-LIVE]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

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
