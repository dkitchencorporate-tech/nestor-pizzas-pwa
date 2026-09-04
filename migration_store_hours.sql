-- ============================================================================
-- MIGRACIÓN: Módulo "Horarios" autogestionable
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (proyecto NestorPizza, jlchjamoejkzahaeimec)
-- Fecha: 2026-09-05
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_hours (
    day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo ... 6=Sábado
    is_open BOOLEAN NOT NULL DEFAULT false,
    open_time TIME,   -- NULL si is_open = false
    close_time TIME,  -- NULL si is_open = false
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Horario publico" ON store_hours;
CREATE POLICY "Horario publico" ON store_hours FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan horario" ON store_hours;
CREATE POLICY "Admins gestionan horario" ON store_hours FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Semilla = el horario actual hardcodeado en el código, para no perder continuidad al migrar.
-- Usa ON CONFLICT para poder re-ejecutar este script sin duplicar filas.
INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, true,  '20:00', '23:30'), -- Domingo
  (1, false, NULL,    NULL),    -- Lunes cerrado
  (2, false, NULL,    NULL),    -- Martes cerrado
  (3, true,  '20:30', '23:30'), -- Miércoles
  (4, true,  '20:00', '23:30'), -- Jueves
  (5, true,  '20:00', '23:59'), -- Viernes
  (6, true,  '20:00', '23:59')  -- Sábado
ON CONFLICT (day_of_week) DO NOTHING;

-- Habilitar Realtime para que el panel admin y la web pública reciban los cambios al instante
-- (mismo mecanismo que ya usa app_settings.store_closed).
ALTER PUBLICATION supabase_realtime ADD TABLE store_hours;

-- ============================================================================
-- VERIFICACIÓN (ejecutar después para confirmar que todo quedó bien):
--   SELECT * FROM store_hours ORDER BY day_of_week;
--   SELECT * FROM pg_policies WHERE tablename = 'store_hours';
-- ============================================================================
