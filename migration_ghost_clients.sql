-- 1. Insertar todos los clientes fantasmas únicos desde orders hacia kiosk_customers
-- De esta forma se formalizan y el sistema de Kiosko les asigna un UUID y los detecta en la búsqueda.
INSERT INTO kiosk_customers (full_name, phone, address, created_at)
SELECT DISTINCT ON (client_phone)
    COALESCE(client_name, 'Cliente Anónimo') AS full_name,
    client_phone AS phone,
    delivery_address AS address,
    MIN(created_at) OVER (PARTITION BY client_phone) AS created_at
FROM orders
WHERE user_id IS NULL 
  AND client_phone IS NOT NULL 
  AND client_phone != '' 
  AND client_phone != 'unknown'
  AND client_phone != 'Sin Teléfono'
  -- Asegurarnos de que no existan ya en profiles o kiosk_customers
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE phone = orders.client_phone)
  AND NOT EXISTS (SELECT 1 FROM kiosk_customers WHERE phone = orders.client_phone);

-- (ELIMINADO el UPDATE a orders.user_id porque orders_user_id_fkey exige que el UUID pertenezca a la tabla profiles,
-- no a kiosk_customers. La relación del Kiosko se hace dinámicamente mediante client_phone).
