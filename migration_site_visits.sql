-- Migración: tráfico de la web pública (visitas y clics por categoría)
-- Ejecutar en el SQL Editor de Supabase (proyecto NestorPizza, jlchjamoejkzahaeimec)
--
-- Mismo patrón de seguridad ya probado en pwa_analytics:
-- cualquiera puede insertar (es el propio navegador del cliente anónimo
-- registrando su visita), solo un admin autenticado puede leer los datos.

CREATE TABLE site_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view' | 'category_click'
  label TEXT,               -- nombre de la categoría cuando event_type = 'category_click'
  device_type TEXT          -- 'mobile' | 'desktop'
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for everyone" ON site_visits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for authenticated admins" ON site_visits
  FOR SELECT USING (auth.role() = 'authenticated');
