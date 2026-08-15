-- Actualizar subcategorías de bebidas existentes para que se agrupen automáticamente

UPDATE products 
SET subcategory = 'CERVEZAS' 
WHERE category_id = 'BEBIDAS' AND name ILIKE '%cerveza%';

UPDATE products 
SET subcategory = 'REFRESCOS' 
WHERE category_id = 'BEBIDAS' AND (name ILIKE '%coca%' OR name ILIKE '%fanta%' OR name ILIKE '%nestea%' OR name ILIKE '%aquarius%' OR name ILIKE '%refresco%');

UPDATE products 
SET subcategory = 'AGUAS' 
WHERE category_id = 'BEBIDAS' AND name ILIKE '%agua%';

UPDATE products 
SET subcategory = 'TINTOS' 
WHERE category_id = 'BEBIDAS' AND name ILIKE '%tinto%';

-- Por si queda alguna otra bebida huérfana, la ponemos en refrescos por defecto
UPDATE products 
SET subcategory = 'OTROS' 
WHERE category_id = 'BEBIDAS' AND subcategory IS NULL;
