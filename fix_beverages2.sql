-- Create BEBIDAS category if it doesn't exist
INSERT INTO categories (id, name, name_en, sort_order) 
VALUES ('BEBIDAS', 'BEBIDAS', 'BEVERAGES', 9) 
ON CONFLICT (id) DO NOTHING;

-- Insert the subcategories, getting their IDs via gen_random_uuid() or uuid_generate_v4()
-- Wait, how to map them to the update?
-- We can do it step by step in a DO block.

DO $$
DECLARE
  v_aguas UUID := gen_random_uuid();
  v_cervezas UUID := gen_random_uuid();
  v_refrescos UUID := gen_random_uuid();
  v_refrescos_grandes UUID := gen_random_uuid();
  v_tintos UUID := gen_random_uuid();
BEGIN
  INSERT INTO subcategories (id, category_id, name, name_en, sort_order) VALUES
    (v_aguas, 'BEBIDAS', 'AGUAS', 'WATER', 1),
    (v_cervezas, 'BEBIDAS', 'CERVEZAS', 'BEERS', 2),
    (v_refrescos, 'BEBIDAS', 'REFRESCOS', 'SOFT DRINKS', 3),
    (v_refrescos_grandes, 'BEBIDAS', 'REFRESCOS GRANDES', 'LARGE SOFT DRINKS', 4),
    (v_tintos, 'BEBIDAS', 'TINTOS', 'WINES', 5);
    
  UPDATE products SET subcategory_id = v_aguas, category_id = 'BEBIDAS' WHERE category_id = 'AGUAS';
  UPDATE products SET subcategory_id = v_cervezas, category_id = 'BEBIDAS' WHERE category_id = 'CERVEZAS';
  UPDATE products SET subcategory_id = v_refrescos, category_id = 'BEBIDAS' WHERE category_id = 'REFRESCOS';
  UPDATE products SET subcategory_id = v_refrescos_grandes, category_id = 'BEBIDAS' WHERE category_id = 'REFRESCOS GRANDES';
  UPDATE products SET subcategory_id = v_tintos, category_id = 'BEBIDAS' WHERE category_id = 'TINTOS';
END $$;
