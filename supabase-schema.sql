-- ==========================================
-- Supabase Schema para Néstor Pizzas (Kiosco)
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLA: categories
-- ==========================================
CREATE TABLE categories (
    id TEXT PRIMARY KEY, -- ej: 'NUESTRAS PIZZAS'
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: products
-- ==========================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    badge TEXT,
    img_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: ingredients
-- ==========================================
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: upsells
-- ==========================================
CREATE TABLE upsells (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: users (Extensión de Auth)
-- ==========================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    points INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: orders
-- ==========================================
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Nullable para pedidos anónimos/kiosco local
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, delivered, cancelled
    estimated_ready_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: order_items
-- ==========================================
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    customization_details JSONB, -- Array de ingredientes extra añadidos o notas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLA: app_settings_global
-- ==========================================
CREATE TABLE app_settings_global (
    id INTEGER PRIMARY KEY DEFAULT 1,
    store_closed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- SEGURIDAD (RLS - Row Level Security)
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura Pública (Cualquiera puede leer el menú)
CREATE POLICY "Menú público" ON categories FOR SELECT USING (true);
CREATE POLICY "Productos públicos" ON products FOR SELECT USING (true);
CREATE POLICY "Ingredientes públicos" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Upsells públicos" ON upsells FOR SELECT USING (true);

-- Políticas de Usuarios (Profiles)
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas de Órdenes
CREATE POLICY "Usuarios pueden ver sus propias órdenes" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Invitados pueden leer órdenes anónimas" ON orders FOR SELECT USING (user_id IS NULL);
CREATE POLICY "Admins pueden ver todo" ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
-- (Políticas eliminadas por seguridad: el cliente ya no puede insertar/modificar órdenes manualmente)
-- Se usa el RPC process_checkout para asegurar integridad.

-- ==========================================
-- ACTIVAR REALTIME
-- ==========================================
-- ¡CRITICO! Estas tablas deben estar en el canal de realtime para que el TPV reciba notificaciones push.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings_global;

-- ==========================================
-- PROTECCIÓN DE PERFILES (Evita Escalada de Privilegios y Hackeo de Puntos)
-- ==========================================
CREATE OR REPLACE FUNCTION protect_profile_fields() RETURNS TRIGGER AS $$
BEGIN
  -- Si no es el rol de servicio, bloqueamos la modificación de campos sensibles a menos que ya sea admin
  IF auth.role() = 'authenticated' THEN
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
          -- Bloqueamos cambios maliciosos forzando que se mantenga el valor antiguo
          NEW.is_admin := OLD.is_admin;
          NEW.points := OLD.points;
      END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_security ON profiles;
CREATE TRIGGER enforce_profile_security
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- ==========================================
-- PROCESAMIENTO SEGURO DE PEDIDOS (RPC)
-- ==========================================
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
BEGIN
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
    IF (p_points_redeemed AND p_user_id IS NOT NULL AND v_eligible_discount > 0) THEN
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND points >= 25) THEN
            v_discount_applied := v_eligible_discount;
            -- Descontar puntos al usuario
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
    
    -- 7. Asignar puntos ganados al usuario (4 puntos por cada 10€)
    IF (p_user_id IS NOT NULL) THEN
        v_points_earned := FLOOR(v_final_total / 10) * 4;
        
        -- Actualizar los puntos ganados en la orden
        UPDATE orders SET points_earned = v_points_earned WHERE id = v_order_id;
        
        -- Actualizar el perfil sumando los puntos
        UPDATE profiles SET points = points + v_points_earned WHERE id = p_user_id;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
