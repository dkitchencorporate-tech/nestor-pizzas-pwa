-- Añadir columnas a tablas existentes
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE upsells ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Crear el bucket de storage para imágenes de productos (si no existe)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar RLS (Row Level Security) para el bucket 'products'
-- Permitir acceso público de lectura
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'products');

-- Permitir inserción y borrado (Asumimos anon role para el MVP, aunque en producción real esto debería usar autenticación, pero por ahora el supabase config lo permite de forma pública)
CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'products');

CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'products');

-- Limpiar los datos "basura" o upsells preexistentes si los hubiere
TRUNCATE TABLE upsells;

-- Insertar algunos upsells de prueba reales
INSERT INTO upsells (id, category, name, description, price, sort_order) VALUES
('u1', 'ENTRANTES', 'Patatas Gajo', 'Ración de patatas gajo especiadas', 2.50, 1),
('u2', 'ENTRANTES', 'Aros de Cebolla', 'Crujientes aros de cebolla fritos', 3.00, 2),
('u3', 'SALSAS', 'Salsa Barbacoa', 'Extra de salsa barbacoa', 0.50, 3),
('u4', 'SALSAS', 'Salsa Ajo', 'Extra de salsa de ajo suave', 0.50, 4);
