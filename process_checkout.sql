CREATE OR REPLACE FUNCTION public.process_checkout(
    p_user_id uuid,
    p_client_name text,
    p_client_phone text,
    p_delivery_address text,
    p_delivery_method text,
    p_items jsonb,
    p_points_redeemed boolean,
    p_small_order_fee_accepted boolean,
    p_ip_address text DEFAULT 'unknown'::text,
    p_notes text DEFAULT NULL::text,
    p_payment_method text DEFAULT 'online'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_order_id UUID;
    v_total_amount DECIMAL(10,2) := 0;
    v_discount_applied DECIMAL(10,2) := 0;
    v_small_order_fee DECIMAL(10,2) := 0;
    v_final_total DECIMAL(10,2) := 0;
    v_points_earned INTEGER := 0;
    v_eligible_discount DECIMAL(10,2) := 0;
    v_item JSONB;
    v_product_price DECIMAL(10,2);
    v_product_name TEXT;
    v_product_category TEXT;
    v_frontend_price DECIMAL(10,2);
    v_actual_profile_id UUID := NULL;
    v_is_thursday BOOLEAN;
    v_jueves_promo_qty INTEGER := 0;
    v_caller_is_admin BOOLEAN := FALSE;
    v_product_is_active BOOLEAN;
BEGIN
    -- 1. Verificar si el llamador es un administrador autenticado en Supabase
    IF auth.uid() IS NOT NULL THEN
        SELECT is_admin INTO v_caller_is_admin FROM profiles WHERE id = auth.uid();
        v_caller_is_admin := COALESCE(v_caller_is_admin, FALSE);
    END IF;

    -- 2. Validar perfil de usuario para fidelización
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
            v_actual_profile_id := p_user_id;
        END IF;
    END IF;

    v_is_thursday := (EXTRACT(DOW FROM timezone('Europe/Madrid', now())) = 4);

    -- 3. Iterar sobre los artículos del pedido y validar precios contra catálogo
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'product_id') IS NOT NULL THEN
            SELECT price, name, category_id, is_active 
            INTO v_product_price, v_product_name, v_product_category, v_product_is_active
            FROM products
            WHERE id = (v_item->>'product_id')::INTEGER;

            IF v_product_price IS NULL THEN
                RAISE EXCEPTION 'Producto no válido en catálogo: %', (v_item->>'product_id');
            END IF;

            IF v_product_is_active = FALSE AND NOT v_caller_is_admin THEN
                RAISE EXCEPTION 'El producto % ya no está disponible actualmente.', v_product_name;
            END IF;

            v_frontend_price := (v_item->>'unit_price')::DECIMAL;

            -- VALIDACIÓN ESTRICTA DE PRECIOS:
            -- Solo se permite alterar el precio si el llamador es ADMINISTRADOR autenticado
            IF NOT v_caller_is_admin AND v_frontend_price < v_product_price THEN
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
            -- Ítems sin product_id (Upsells / complementos)
            v_frontend_price := (v_item->>'unit_price')::DECIMAL;
            v_product_name := COALESCE((v_item->'customization_details'->>'name'), 'Complemento');
            
            -- Prevenir precios negativos o manipulación arbitraria
            IF NOT v_caller_is_admin AND v_frontend_price < 0.00 THEN
                RAISE EXCEPTION 'Precio no válido para el artículo %', v_product_name;
            END IF;
        END IF;

        v_total_amount := v_total_amount + (v_frontend_price * (v_item->>'quantity')::INTEGER);

        -- Cálculo de descuento por fidelización (Pizza o hamburguesa más económica para descuento VIP)
        IF (p_points_redeemed) THEN
            IF (v_product_name ILIKE '%pizza%' OR v_product_name ILIKE '%burguer%') THEN
                IF (v_eligible_discount = 0 OR v_frontend_price < v_eligible_discount) THEN
                    v_eligible_discount := v_frontend_price;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 4. Aplicación de Puntos VIP Club (25 puntos = pizza gratis/descuento)
    IF (p_points_redeemed AND v_actual_profile_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = v_actual_profile_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            UPDATE profiles SET points = points - 25 WHERE id = v_actual_profile_id;
        END IF;
    END IF;

    -- 5. Recargo por pedido pequeño a domicilio (< 12€)
    IF (p_delivery_method = 'delivery' AND (v_total_amount - v_discount_applied) < 12 AND p_small_order_fee_accepted) THEN
        v_small_order_fee := 1.50;
    END IF;

    v_final_total := GREATEST(0, v_total_amount - v_discount_applied) + v_small_order_fee;

    -- 6. Inserción de la orden en la tabla orders
    INSERT INTO orders (
        user_id, total_amount, status, client_name, client_phone,
        delivery_address, delivery_method, points_earned, points_redeemed, discount_applied, notes, payment_method
    ) VALUES (
        v_actual_profile_id, v_final_total, 'pending', p_client_name, p_client_phone,
        p_delivery_address, p_delivery_method, 0,
        CASE WHEN v_discount_applied > 0 THEN 25 ELSE 0 END,
        v_discount_applied, p_notes, p_payment_method
    ) RETURNING id INTO v_order_id;

    -- 7. Inserción de líneas de pedido en order_items
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

    -- 8. Asignación de puntos VIP ganados (4 puntos por cada 10€ gastados)
    IF (v_actual_profile_id IS NOT NULL) THEN
        v_points_earned := FLOOR(v_final_total / 10) * 4;
        UPDATE orders SET points_earned = v_points_earned WHERE id = v_order_id;
        UPDATE profiles SET points = points + v_points_earned WHERE id = v_actual_profile_id;
    END IF;

    RETURN v_order_id;
END;
$$;