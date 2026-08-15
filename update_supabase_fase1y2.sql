-- ==========================================
-- ACTUALIZACIÓN DE BASE DE DATOS SUPABASE
-- FASES 1 Y 2
-- ==========================================

-- 1. Subida general de precios de +0.50€
-- Excluyendo 'BEBIDAS' y 'MAZZI PIZZAS' según los requisitos
UPDATE products
SET price = price + 0.50
WHERE category_id NOT IN ('BEBIDAS', 'MAZZI PIZZAS');

-- 2. Crear categoría "PROMOCIONES"
INSERT INTO categories (id, name, subtitle, description, sort_order)
VALUES ('PROMOCIONES', 'PROMOCIONES', NULL, 'Ofertas especiales y promociones exclusivas', 0)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear o actualizar el producto "Jueves Locos"
INSERT INTO products (id, category_id, name, description, price, badge, img_url, is_active)
VALUES (
    999,
    'PROMOCIONES',
    'Jueves Locos (2x11€)',
    'Dos pizzas por 11 euros. Promoción válida solo los jueves. (Pulsa para configurar)',
    11.00,
    'SOLO JUEVES',
    './assets/img/products/jueves_locos_2_pizzas.png',
    true
)
ON CONFLICT (id) DO UPDATE 
SET 
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    badge = EXCLUDED.badge,
    img_url = EXCLUDED.img_url;
