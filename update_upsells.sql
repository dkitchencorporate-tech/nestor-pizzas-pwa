DROP TABLE IF EXISTS upsells CASCADE;

CREATE TABLE upsells (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos públicos para que funcione desde el panel de control
ALTER TABLE upsells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Select Upsells" ON upsells FOR SELECT USING (true);
CREATE POLICY "Public Insert Upsells" ON upsells FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Upsells" ON upsells FOR UPDATE USING (true);
CREATE POLICY "Public Delete Upsells" ON upsells FOR DELETE USING (true);
