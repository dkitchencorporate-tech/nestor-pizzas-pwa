-- Create BEBIDAS category if it doesn't exist
INSERT INTO categories (id, name, name_en, sort_order) 
VALUES ('BEBIDAS', 'BEBIDAS', 'BEVERAGES', 9) 
ON CONFLICT (id) DO NOTHING;

-- Create subcategories
INSERT INTO subcategories (id, category_id, name, name_en, sort_order) 
VALUES 
  (uuid_generate_v5(uuid_ns_url(), 'AGUAS'), 'BEBIDAS', 'AGUAS', 'WATER', 1),
  (uuid_generate_v5(uuid_ns_url(), 'CERVEZAS'), 'BEBIDAS', 'CERVEZAS', 'BEERS', 2),
  (uuid_generate_v5(uuid_ns_url(), 'REFRESCOS'), 'BEBIDAS', 'REFRESCOS', 'SOFT DRINKS', 3),
  (uuid_generate_v5(uuid_ns_url(), 'REFRESCOS GRANDES'), 'BEBIDAS', 'REFRESCOS GRANDES', 'LARGE SOFT DRINKS', 4),
  (uuid_generate_v5(uuid_ns_url(), 'TINTOS'), 'BEBIDAS', 'TINTOS', 'WINES', 5)
ON CONFLICT DO NOTHING;

-- Update products to use these subcategories
UPDATE products SET 
  subcategory_id = uuid_generate_v5(uuid_ns_url(), category_id),
  category_id = 'BEBIDAS'
WHERE category_id IN ('AGUAS', 'CERVEZAS', 'REFRESCOS', 'REFRESCOS GRANDES', 'TINTOS');
