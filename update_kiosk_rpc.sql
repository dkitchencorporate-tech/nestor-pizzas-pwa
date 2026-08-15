-- ==========================================
-- ACTUALIZACIÓN DE SEGURIDAD Y RPC PARA TPV KIOSKO
-- ==========================================

-- 1. Función para buscar clientes por teléfono/nombre/dirección para el TPV
-- Devuelve tanto clientes registrados en perfiles como "clientes fantasma" extraídos del historial de pedidos.
CREATE OR REPLACE FUNCTION search_client(p_query TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    points INTEGER,
    is_registered BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_clean_query TEXT;
BEGIN
    -- Solo admins pueden usar esta función
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
        RAISE EXCEPTION 'No tienes permiso para buscar clientes.';
    END IF;

    v_clean_query := '%' || TRIM(p_query) || '%';

    RETURN QUERY
    -- Primero buscamos en los perfiles registrados
    SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.phone, 
        p.address, 
        p.points,
        true AS is_registered
    FROM profiles p
    WHERE p.phone ILIKE v_clean_query 
       OR p.full_name ILIKE v_clean_query 
       OR p.address ILIKE v_clean_query

    UNION ALL

    -- Luego buscamos en pedidos pasados para autocompletar (clientes no registrados)
    -- Usamos DISTINCT ON (client_phone) para no repetir
    SELECT DISTINCT ON (o.client_phone)
        NULL::UUID as id,
        o.client_name as full_name,
        NULL::TEXT as email,
        o.client_phone as phone,
        o.delivery_address as address,
        0 as points,
        false AS is_registered
    FROM orders o
    WHERE o.user_id IS NULL 
      AND (o.client_phone ILIKE v_clean_query 
           OR o.client_name ILIKE v_clean_query 
           OR o.delivery_address ILIKE v_clean_query)
      -- Excluir los que ya están en la tabla perfiles con ese teléfono
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.phone = o.client_phone)
    ORDER BY o.client_phone, o.created_at DESC
    LIMIT 20;
END;
$$;


-- 2. Actualizar process_checkout para tapar hueco de seguridad y permitir suplantación controlada (Admin TPV)
CREATE OR REPLACE FUNCTION process_checkout(
    p_user_id UUID,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_delivery_address TEXT,
    p_delivery_method TEXT,
    p_items JSONB,
    p_points_redeemed BOOLEAN,
    p_small_order_fee_accepted BOOLEAN
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total_amount DECIMAL(10,2) := 0;
    v_eligible_discount DECIMAL(10,2) := 0;
    v_discount_applied DECIMAL(10,2) := 0;
    v_small_order_fee DECIMAL(10,2) := 0;
    v_final_total DECIMAL(10,2) := 0;
    v_points_earned INTEGER := 0;
    
    v_product_price DECIMAL(10,2);
    v_product_name TEXT;
    v_product_category TEXT;
    v_item JSONB;
    v_frontend_price DECIMAL(10,2);
    v_is_thursday BOOLEAN;
    v_jueves_promo_qty INTEGER := 0;
BEGIN
    -- SECURITY CHECK: Si el user_id no es nulo y no es el auth.uid(), solo lo permitimos si el caller es admin.
    IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
            RAISE EXCEPTION 'No puedes procesar un pedido en nombre de otro usuario.';
        END IF;
    END IF;

    -- Determinar si hoy es jueves en España (DOW: 0=Domingo, 4=Jueves)
    v_is_thursday := (EXTRACT(DOW FROM timezone('Europe/Madrid', now())) = 4);

    -- 1. Validar precios e ir sumando el total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'product_id') IS NOT NULL THEN
            SELECT price, name, category_id INTO v_product_price, v_product_name, v_product_category
            FROM products 
            WHERE id = (v_item->>'product_id')::INTEGER;
            
            IF v_product_price IS NULL THEN
                RAISE EXCEPTION 'Producto no válido o inactivo: %', (v_item->>'product_id');
            END IF;

            v_frontend_price := (v_item->>'unit_price')::DECIMAL;

            IF v_frontend_price < v_product_price THEN
                IF v_is_thursday 
                   AND v_frontend_price = 5.50 
                   AND v_product_category = 'NUESTRAS PIZZAS' 
                   AND (v_item->'customization_details'->>'name') ILIKE '%(Promo Jueves)%' THEN
                    v_jueves_promo_qty := v_jueves_promo_qty + (v_item->>'quantity')::INTEGER;
                ELSE
                    RAISE EXCEPTION 'Manipulación de precio detectada. Producto base % cuesta % pero se envió %.', v_product_name, v_product_price, v_frontend_price;
                END IF;
            END IF;
        ELSE
            v_frontend_price := (v_item->>'unit_price')::DECIMAL;
            v_product_name := (v_item->'customization_details'->>'name');
        END IF;

        v_total_amount := v_total_amount + (v_frontend_price * (v_item->>'quantity')::INTEGER);
        
        IF (p_points_redeemed) THEN
            IF (v_product_name ILIKE '%pizza%' OR v_product_name ILIKE '%burguer%') THEN
                IF (v_eligible_discount = 0 OR v_frontend_price < v_eligible_discount) THEN
                    v_eligible_discount := v_frontend_price;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    IF v_jueves_promo_qty % 2 != 0 THEN
        RAISE EXCEPTION 'La promoción Jueves Locos requiere que las pizzas se pidan en pares (2x11€). Cantidad de pizzas en promoción enviada: %', v_jueves_promo_qty;
    END IF;
    
    -- 2. Aplicar descuento de puntos si corresponde y si el usuario tiene puntos suficientes
    IF (p_points_redeemed AND p_user_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            UPDATE profiles SET points = points - 25 WHERE id = p_user_id;
        END IF;
    END IF;
    
    -- 3. Calcular fee por pedido pequeño
    IF (p_delivery_method = 'delivery' AND (v_total_amount - v_discount_applied) < 12 AND p_small_order_fee_accepted) THEN
        v_small_order_fee := 1.50;
    END IF;
    
    -- 4. Total Final Validado por el Servidor
    v_final_total := GREATEST(0, v_total_amount - v_discount_applied) + v_small_order_fee;
    
    -- 5. Crear la orden
    INSERT INTO orders (
        user_id, total_amount, status, client_name, client_phone, 
        delivery_address, delivery_method, points_earned, points_redeemed, discount_applied
    ) VALUES (
        p_user_id, v_final_total, 'pending', p_client_name, p_client_phone,
        p_delivery_address, p_delivery_method, 0, 
        CASE WHEN v_discount_applied > 0 THEN 25 ELSE 0 END, 
        v_discount_applied
    ) RETURNING id INTO v_order_id;
    
    -- 6. Insertar los items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, customization_details
        ) VALUES (
            v_order_id, 
            (v_item->>'product_id')::INTEGER, 
            (v_item->>'quantity')::INTEGER, 
            (v_item->>'unit_price')::DECIMAL, 
            v_item->'customization_details'
        );
    END LOOP;
    
    -- 7. Asignar puntos ganados al usuario
    IF (p_user_id IS NOT NULL) THEN
        v_points_earned := FLOOR(v_final_total / 10) * 4;
        
        UPDATE orders SET points_earned = v_points_earned WHERE id = v_order_id;
        UPDATE profiles SET points = points + v_points_earned WHERE id = p_user_id;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
