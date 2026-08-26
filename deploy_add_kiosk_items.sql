CREATE OR REPLACE FUNCTION public.add_items_to_kiosk_order(p_order_id uuid, p_items jsonb, p_extra_total numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item JSONB;
    v_unit_price DECIMAL;
    v_product_id INTEGER;
    v_quantity INTEGER;
BEGIN
    -- Update the total amount of the existing order
    UPDATE orders 
    SET total_amount = total_amount + p_extra_total
    WHERE id = p_order_id;

    -- Insert only the new items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::INTEGER;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item ? 'unit_price') THEN
            v_unit_price := (v_item->>'unit_price')::DECIMAL;
        ELSIF (v_item ? 'price') THEN
            v_unit_price := (v_item->>'price')::DECIMAL;
        ELSE
            v_unit_price := 0;
        END IF;

        INSERT INTO order_items (order_id, product_id, quantity, unit_price, customization_details)
        VALUES (
            p_order_id, 
            v_product_id, 
            v_quantity, 
            v_unit_price, 
            v_item->'customization_details'
        );
    END LOOP;
END;
$function$;
