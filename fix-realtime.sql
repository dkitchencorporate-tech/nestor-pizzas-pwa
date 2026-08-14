-- 1. Crear una función segura para comprobar si el usuario es admin
-- Al usar SECURITY DEFINER evitamos que Realtime se bloquee por falta de permisos.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin FROM profiles WHERE id = auth.uid();
$$;

-- 2. Asegurarnos de que existe la política para que los Admins vean todas las órdenes
-- Borramos si existe alguna versión anterior defectuosa
DROP POLICY IF EXISTS "Admins pueden ver todas las órdenes" ON orders;

-- 3. Creamos la política limpia
CREATE POLICY "Admins pueden ver todas las órdenes" 
ON orders 
FOR SELECT 
USING ( public.is_admin() );
