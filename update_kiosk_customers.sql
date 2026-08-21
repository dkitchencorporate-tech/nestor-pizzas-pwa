-- ==========================================
-- FASE 4.1: CLIENTES DE KIOSKO Y BÚSQUEDA AVANZADA
-- ==========================================

-- 1. Crear tabla para clientes que no usan la app (kiosk_customers)
CREATE TABLE IF NOT EXISTS kiosk_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configurar RLS para kiosk_customers
ALTER TABLE kiosk_customers ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo los admins pueden leer y escribir
DROP POLICY IF EXISTS "Admins can view kiosk customers" ON kiosk_customers;
CREATE POLICY "Admins can view kiosk customers" ON kiosk_customers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can insert kiosk customers" ON kiosk_customers;
CREATE POLICY "Admins can insert kiosk customers" ON kiosk_customers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can update kiosk customers" ON kiosk_customers;
CREATE POLICY "Admins can update kiosk customers" ON kiosk_customers
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 2. Función para crear un cliente de Kiosko de forma segura
CREATE OR REPLACE FUNCTION create_kiosk_client(p_full_name TEXT, p_phone TEXT, p_address TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_existing_profile_id UUID;
BEGIN
    -- Validar permisos de administrador
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo los administradores pueden crear clientes locales.';
    END IF;

    -- Validar que no exista ya en perfiles (App)
    SELECT id INTO v_existing_profile_id FROM profiles WHERE phone = p_phone LIMIT 1;
    IF v_existing_profile_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un usuario de la App registrado con ese teléfono.';
    END IF;

    -- Insertar o actualizar (si ya existía en kiosk_customers con ese teléfono)
    INSERT INTO kiosk_customers (full_name, phone, address)
    VALUES (p_full_name, p_phone, p_address)
    ON CONFLICT (phone) DO UPDATE 
    SET full_name = EXCLUDED.full_name, address = EXCLUDED.address
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- 3. Actualizar la función search_client para buscar en perfiles y kiosk_customers
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
    -- 1. Buscamos en perfiles registrados (App)
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
    
    -- 2. Buscamos en clientes de kiosko
    -- Asegurándonos de no devolver si ya están en profiles (por si acaso un teléfono coincide)
    SELECT 
        k.id,
        k.full_name,
        NULL::TEXT AS email,
        k.phone,
        k.address,
        0 AS points,
        false AS is_registered
    FROM kiosk_customers k
    WHERE (k.phone ILIKE v_clean_query 
       OR k.full_name ILIKE v_clean_query 
       OR k.address ILIKE v_clean_query)
       AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.phone = k.phone)

    UNION ALL

    -- 3. Fallback: Búsqueda en pedidos antiguos (por si no estaban en kiosk_customers)
    -- Excluyendo los que ya salieron en profiles o kiosk_customers
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
      AND o.client_phone IS NOT NULL
      AND o.client_phone != ''
      AND (o.client_phone ILIKE v_clean_query 
           OR o.client_name ILIKE v_clean_query 
           OR o.delivery_address ILIKE v_clean_query)
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.phone = o.client_phone)
      AND NOT EXISTS (SELECT 1 FROM kiosk_customers k WHERE k.phone = o.client_phone);

END;
$$;

-- PARCHE KIOSKO ERROR FOREIGN KEY
CREATE OR REPLACE FUNCTION process_checkout(
    p_user_id UUID,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_delivery_address TEXT,
    p_delivery_method TEXT,
    p_items JSONB, -- Array of { product_id, quantity, customization_details, unit_price }
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
    
    v_actual_profile_id UUID := NULL;
BEGIN
    -- Validar si el p_user_id proporcionado existe en la tabla profiles (usuarios registrados).
    -- Si proviene de kiosk_customers, se quedará como NULL para no violar la Foreign Key.
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
            v_actual_profile_id := p_user_id;
        END IF;
    END IF;

    -- Determinar si hoy es jueves en España (DOW: 0=Domingo, 4=Jueves)
    v_is_thursday := (EXTRACT(DOW FROM timezone('Europe/Madrid', now())) = 4);

    -- 1. Validar precios e ir sumando el total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Check if product exists in DB
        IF (v_item->>'product_id') IS NOT NULL THEN
            SELECT price, name, category_id INTO v_product_price, v_product_name, v_product_category
            FROM products 
            WHERE id = (v_item->>'product_id')::INTEGER;
            
            IF v_product_price IS NULL THEN
                RAISE EXCEPTION 'Producto no válido o inactivo: %', (v_item->>'product_id');
            END IF;

            v_frontend_price := (v_item->>'unit_price')::DECIMAL;

            -- Validación de seguridad: El frontend no puede mandar un precio MENOR al precio base
            IF v_frontend_price < v_product_price THEN
                -- EXCEPCIÓN: Promoción Jueves Locos (2x11€ -> 5.50€ c/u)
                IF v_is_thursday 
                   AND v_frontend_price = 5.50 
                   AND v_product_category = 'NUESTRAS PIZZAS' 
                   AND (v_item->'customization_details'->>'name') ILIKE '%(Promo Jueves)%' THEN
                    -- Permitido por promoción Jueves Locos
                    v_jueves_promo_qty := v_jueves_promo_qty + (v_item->>'quantity')::INTEGER;
                ELSE
                    RAISE EXCEPTION 'Manipulación de precio detectada. Producto base % cuesta % pero se envió %.', v_product_name, v_product_price, v_frontend_price;
                END IF;
            END IF;
        ELSE
            -- Si el product_id es null (producto genérico o custom), confiamos en el precio frontend por ahora.
            v_frontend_price := (v_item->>'unit_price')::DECIMAL;
            v_product_name := (v_item->'customization_details'->>'name');
        END IF;

        -- Sumar al subtotal real
        v_total_amount := v_total_amount + (v_frontend_price * (v_item->>'quantity')::INTEGER);
        
        -- Calcular posible descuento de puntos (el producto válido más barato, como en el frontend)
        -- Si es pizza o burguer
        IF (p_points_redeemed) THEN
            IF (v_product_name ILIKE '%pizza%' OR v_product_name ILIKE '%burguer%') THEN
                IF (v_eligible_discount = 0 OR v_frontend_price < v_eligible_discount) THEN
                    v_eligible_discount := v_frontend_price;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- Validar matemáticamente que la promo del jueves se aplique estrictamente en pares (2x11€)
    IF v_jueves_promo_qty % 2 != 0 THEN
        RAISE EXCEPTION 'La promoción Jueves Locos requiere que las pizzas se pidan en pares (2x11€). Cantidad de pizzas en promoción enviada: %', v_jueves_promo_qty;
    END IF;
    
    -- 2. Aplicar descuento de puntos si corresponde y si el usuario tiene puntos suficientes
    IF (p_points_redeemed AND v_actual_profile_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = v_actual_profile_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            -- Descontar puntos al usuario
            UPDATE profiles SET points = points - 25 WHERE id = v_actual_profile_id;
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
        v_actual_profile_id, v_final_total, 'pending', p_client_name, p_client_phone,
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
    
    -- 7. Asignar puntos ganados al usuario (4 puntos por cada 10€)
    IF (v_actual_profile_id IS NOT NULL) THEN
        v_points_earned := FLOOR(v_final_total / 10) * 4;
        
        -- Actualizar los puntos ganados en la orden
        UPDATE orders SET points_earned = v_points_earned WHERE id = v_order_id;
        
        -- Actualizar el perfil sumando los puntos
        UPDATE profiles SET points = points + v_points_earned WHERE id = v_actual_profile_id;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
