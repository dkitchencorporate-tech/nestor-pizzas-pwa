CREATE TABLE IF NOT EXISTS public.store_settings (
    id smallint PRIMARY KEY DEFAULT 1,
    delivery_fee numeric(10,2) NOT NULL DEFAULT 1.00,
    min_order_delivery numeric(10,2) NOT NULL DEFAULT 10.00,
    jueves_promo_fee numeric(10,2) NOT NULL DEFAULT 1.00
);

INSERT INTO public.store_settings (id, delivery_fee, min_order_delivery, jueves_promo_fee)
VALUES (1, 1.00, 10.00, 1.00)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.store_settings;
CREATE POLICY "Enable read access for all users" ON public.store_settings
    AS PERMISSIVE FOR SELECT TO public USING (true);

GRANT SELECT ON TABLE public.store_settings TO anon;
GRANT SELECT ON TABLE public.store_settings TO authenticated;
GRANT ALL ON TABLE public.store_settings TO service_role;

CREATE OR REPLACE FUNCTION public.process_checkout(p_user_id uuid, p_client_name text, p_client_phone text, p_delivery_address text, p_delivery_method text, p_items jsonb, p_points_redeemed boolean, p_small_order_fee_accepted boolean, p_ip_address text DEFAULT 'unknown'::text, p_notes text DEFAULT NULL::text, p_payment_method text DEFAULT 'online'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order_id UUID;
    v_total_amount DECIMAL(10,2) := 0;
    v_eligible_discount DECIMAL(10,2) := 0;
    v_discount_applied DECIMAL(10,2) := 0;
    v_small_order_fee DECIMAL(10,2) := 0;
    v_jueves_surcharge DECIMAL(10,2) := 0;
    v_final_total DECIMAL(10,2) := 0;
    v_points_earned INTEGER := 0;
    v_product_price DECIMAL(10,2);
    v_product_name TEXT;
    v_product_category TEXT;
    v_item JSONB;
    v_frontend_price DECIMAL(10,2);
    v_is_thursday BOOLEAN;
    v_jueves_promo_qty INTEGER := 0;
    v_actual_profile_id UUID := NULL;
    v_settings record;
BEGIN
    SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;

    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
            v_actual_profile_id := p_user_id;
        END IF;
    END IF;

    v_is_thursday := (EXTRACT(DOW FROM timezone('Europe/Madrid', now())) = 4);

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

            -- VALIDACIÓN DE HACKEO DE PRECIOS: Se ignora si el pedido viene del Kiosko (Admin)
            IF p_ip_address != 'kiosk' AND v_frontend_price < v_product_price THEN
                IF v_is_thursday
                   AND v_frontend_price = 5.50
                   AND v_product_category = 'NUESTRAS PIZZAS'
                   AND (v_item->'customization_details'->>'name') ILIKE '%(Promo Jueves)%' THEN
                    v_jueves_promo_qty := v_jueves_promo_qty + (v_item->>'quantity')::INTEGER;
                ELSE
                    RAISE EXCEPTION 'Manipulación de precio detectada. Producto base % cuesta % pero se envió %.', v_product_name, v_product_price, v_frontend_price;
                END IF;
            END IF;
            
            IF (v_item->>'product_id')::INTEGER = 999 OR (v_item->'customization_details'->>'name') ILIKE '%(Promo Jueves)%' THEN
                v_jueves_promo_qty := v_jueves_promo_qty + (v_item->>'quantity')::INTEGER;
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

    IF (p_points_redeemed AND v_actual_profile_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = v_actual_profile_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            UPDATE profiles SET points = points - 25 WHERE id = v_actual_profile_id;
        END IF;
    END IF;

    IF (p_delivery_method = 'delivery' AND (v_total_amount - v_discount_applied) < v_settings.min_order_delivery AND p_small_order_fee_accepted) THEN
        v_small_order_fee := v_settings.delivery_fee;
    END IF;

    IF (p_delivery_method = 'delivery' AND v_jueves_promo_qty > 0) THEN
        v_jueves_surcharge := v_settings.jueves_promo_fee;
    END IF;

    v_final_total := GREATEST(0, v_total_amount - v_discount_applied) + v_small_order_fee + v_jueves_surcharge;

    INSERT INTO orders (
        user_id, total_amount, status, client_name, client_phone,
        delivery_address, delivery_method, points_earned, points_redeemed, discount_applied, notes, payment_method
    ) VALUES (
        v_actual_profile_id, v_final_total, 'pending', p_client_name, p_client_phone,
        p_delivery_address, p_delivery_method, 0,
        CASE WHEN v_discount_applied > 0 THEN 25 ELSE 0 END,
        v_discount_applied, p_notes, p_payment_method
    ) RETURNING id INTO v_order_id;

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

    IF (v_actual_profile_id IS NOT NULL) THEN
        v_points_earned := FLOOR(v_final_total / 10) * 4;
        UPDATE orders SET points_earned = v_points_earned WHERE id = v_order_id;
        UPDATE profiles SET points = points + v_points_earned WHERE id = v_actual_profile_id;
    END IF;

    RETURN v_order_id;
END;
$function$;
