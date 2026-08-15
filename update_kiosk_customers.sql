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
