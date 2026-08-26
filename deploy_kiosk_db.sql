-- Update search_client to include address in the search
CREATE OR REPLACE FUNCTION public.search_client(p_query text)
 RETURNS TABLE(id uuid, full_name text, phone text, address text, points integer, is_registered boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. Clientes registrados en la app
  RETURN QUERY
  SELECT p.id, COALESCE(p.full_name, p.email), p.phone,
         p.address, p.points, TRUE
  FROM profiles p
  WHERE p.phone ILIKE '%' || p_query || '%'
     OR p.full_name ILIKE '%' || p_query || '%'
     OR p.email ILIKE '%' || p_query || '%'
     OR p.address ILIKE '%' || p_query || '%'
  LIMIT 10;

  -- 2. Clientes creados manualmente en el kiosko (Kiosk Customers)
  RETURN QUERY
  SELECT k.id, k.full_name, k.phone,
         k.address, 0, FALSE
  FROM kiosk_customers k
  WHERE k.phone ILIKE '%' || p_query || '%'
     OR k.full_name ILIKE '%' || p_query || '%'
     OR k.address ILIKE '%' || p_query || '%'
  LIMIT 10;

  -- 3. Clientes históricos de pedidos huérfanos (por si acaso quedan)
  RETURN QUERY
  SELECT DISTINCT ON (o.client_phone)
    NULL::UUID, o.client_name, o.client_phone,
    o.delivery_address, 0, FALSE
  FROM orders o
  WHERE o.client_phone ILIKE '%' || p_query || '%'
     OR o.client_name ILIKE '%' || p_query || '%'
     OR o.delivery_address ILIKE '%' || p_query || '%'
  ORDER BY o.client_phone, o.created_at DESC
  LIMIT 10;
END;
$function$;

-- Fix create_kiosk_client to actually persist and handle upserts/merges
CREATE OR REPLACE FUNCTION public.create_kiosk_client(p_full_name text, p_phone text, p_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_id UUID;
  v_existing_profile_id UUID;
  v_existing_kiosk_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo admins pueden crear clientes desde el TPV.';
  END IF;

  -- Verify if phone already exists in profiles (App user)
  SELECT id INTO v_existing_profile_id FROM profiles WHERE phone = p_phone LIMIT 1;
  IF v_existing_profile_id IS NOT NULL THEN
    -- Optionally update address if empty, but for now just return the profile ID
    RETURN v_existing_profile_id;
  END IF;

  -- Verify if phone exists in kiosk_customers
  SELECT id INTO v_existing_kiosk_id FROM kiosk_customers WHERE phone = p_phone LIMIT 1;
  IF v_existing_kiosk_id IS NOT NULL THEN
    -- Update existing kiosk customer
    UPDATE kiosk_customers 
    SET full_name = p_full_name, address = p_address 
    WHERE id = v_existing_kiosk_id;
    RETURN v_existing_kiosk_id;
  END IF;

  -- Otherwise, create new
  v_id := gen_random_uuid();
  INSERT INTO kiosk_customers (id, full_name, phone, address)
  VALUES (v_id, p_full_name, p_phone, p_address);

  RETURN v_id;
END;
$function$;
