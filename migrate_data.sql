-- 1. Insert unique subcategories from the products table
INSERT INTO public.subcategories (category_id, name, name_en, img_url)
SELECT DISTINCT 
    category_id, 
    UPPER(subcategory), 
    UPPER(COALESCE(subcategory_en, subcategory)), 
    MAX(img_url)
FROM public.products
WHERE subcategory IS NOT NULL AND subcategory != ''
GROUP BY category_id, subcategory, subcategory_en;

-- 2. Update products to point to the newly created subcategories
UPDATE public.products p
SET subcategory_id = s.id
FROM public.subcategories s
WHERE p.category_id = s.category_id 
  AND UPPER(p.subcategory) = UPPER(s.name);
