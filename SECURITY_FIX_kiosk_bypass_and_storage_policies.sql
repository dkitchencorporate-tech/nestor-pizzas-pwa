-- ==========================================================================
-- SECURITY FIX — preparado 2026-09-02, NO aplicado todavía contra la BD real.
-- Ejecutar manualmente en el SQL Editor de Supabase (proyecto jlchjamoejkzahaeimec)
-- cuando karc0 dé el visto bueno. Requiere el service_role / password de DB,
-- que se mantienen solo en Doc operativos/CREDENCIALES_SUPABASE_Y_VERCEL.txt.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. FIX CRÍTICO: manipulación de precios vía process_checkout('kiosk')
-- --------------------------------------------------------------------------
-- Hallazgo: la versión actualmente desplegada de process_checkout() salta
-- por completo la validación de precio cuando p_ip_address = 'kiosk':
--     IF p_ip_address != 'kiosk' AND v_frontend_price < v_product_price THEN ...
-- 'kiosk' es un string plano que el propio cliente (navegador) envía en el
-- payload del RPC — no hay ninguna verificación de que quien llama sea
-- realmente un admin autenticado. Cualquiera con la anon key pública puede
-- llamar a supabase.rpc('process_checkout', { p_ip_address: 'kiosk', ... })
-- directamente (sin pasar por la UI) y fijar el precio que quiera.
--
-- Fix: sustituir el bypass por string por una verificación real de
-- auth.uid() + is_admin(), igual que ya se hace en el resto del esquema
-- (protect_profile_fields, políticas RLS de orders/profiles).

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
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    v_actual_profile_id UUID := NULL;
    v_caller_is_admin BOOLEAN := false;
BEGIN
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
            v_actual_profile_id := p_user_id;
        END IF;
    END IF;

    -- Verificación REAL de admin, en vez de confiar en el string 'kiosk'
    -- que manda el cliente. Solo un admin autenticado (auth.uid()) puede
    -- saltarse la validación de precio base (uso legítimo: kiosco/mostrador
    -- con descuentos manuales dados por el propio dueño/staff).
    v_caller_is_admin := EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    );

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

            -- CAMBIO CLAVE: v_caller_is_admin (verificado en servidor) en vez
            -- de "p_ip_address != 'kiosk'" (string enviado por el cliente).
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

    IF (p_points_redeemed AND v_actual_profile_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = v_actual_profile_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            UPDATE profiles SET points = points - 25 WHERE id = v_actual_profile_id;
        END IF;
    END IF;

    IF (p_delivery_method = 'delivery' AND (v_total_amount - v_discount_applied) < 12 AND p_small_order_fee_accepted) THEN
        v_small_order_fee := 1.50;
    END IF;

    v_final_total := GREATEST(0, v_total_amount - v_discount_applied) + v_small_order_fee;

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

-- IMPORTANTE tras aplicar esto: en AdminKiosk.tsx, el staff debe estar
-- autenticado con Supabase Auth (sesión de un profile con is_admin=true)
-- para que el kiosco siga pudiendo aplicar descuentos manuales. Si el
-- kiosco hoy opera sin login de admin, hay que añadírselo — si no, se
-- pierde la función de descuento manual del mostrador (no un problema de
-- seguridad, pero sí de funcionalidad a verificar antes de aplicar el fix).

-- --------------------------------------------------------------------------
-- 2. FIX CRÍTICO: bucket de storage 'products' con INSERT/UPDATE/DELETE
--    públicos (cualquiera, sin login, puede subir/machacar/borrar imágenes)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
-- "Public Access" (SELECT) se mantiene: las imágenes de productos deben
-- poder leerse públicamente para que la PWA las muestre.

CREATE POLICY "Admins pueden subir imágenes de productos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins pueden reemplazar imágenes de productos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins pueden borrar imágenes de productos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Tras esto: subir fotos de catálogo (AdminCatalog.tsx) requiere que el
-- admin tenga una sesión de Supabase Auth activa al hacer la llamada de
-- storage upload — confirmar que el cliente de supabase-js ya manda el
-- Authorization header de la sesión (por defecto sí lo hace).
