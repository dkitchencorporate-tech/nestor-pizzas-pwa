const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Alex_019403@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

async function updateRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');
    
    const sql = `
-- 1. Create a secure function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  status BOOLEAN;
BEGIN
  SELECT is_admin INTO status FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up old admin policies to avoid duplicates
DROP POLICY IF EXISTS "Admins todo en profiles" ON profiles;
DROP POLICY IF EXISTS "Admins todo en orders" ON orders;
DROP POLICY IF EXISTS "Admins todo en order_items" ON order_items;
DROP POLICY IF EXISTS "Admins todo en app_settings" ON app_settings;

-- 3. Apply Admin bypass policies (ALL privileges)
CREATE POLICY "Admins todo en profiles" ON profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins todo en orders" ON orders FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins todo en order_items" ON order_items FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins todo en app_settings" ON app_settings FOR ALL TO authenticated USING (public.is_admin());
    `;
    
    console.log('Executing RLS migration...');
    await client.query(sql);
    console.log('RLS migration executed successfully.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

updateRLS();
