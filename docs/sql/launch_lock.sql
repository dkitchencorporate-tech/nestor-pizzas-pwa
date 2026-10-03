-- =============================================================================
-- Néstor Pizzas · Modo prelanzamiento (launch_lock)
-- Ejecutar en Supabase → SQL Editor, ANTES de fusionar el PR del frontend.
-- Orden: 0) diagnóstico  1) activar ajuste  2) trigger  3) comprobar
-- =============================================================================

-- 0) DIAGNÓSTICO (solo lectura): políticas actuales de app_settings.
--    Revisar que solo un administrador pueda escribir (INSERT/UPDATE).
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings';

-- 1) Activar el prelanzamiento (desde este momento la web muestra la pantalla
--    en cuanto se despliegue el PR, y el servidor ya rechaza pedidos).
INSERT INTO public.app_settings (key, value) VALUES ('launch_lock', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2) Bloqueo en servidor: ningún pedido nuevo mientras launch_lock = 'true',
--    salvo:
--      · administradores (kiosko del local, autorizado por karc0);
--      · service_role (webhook de SumUp: completa pagos que ya se iniciaron
--        antes de activar el bloqueo, para no cobrar sin crear el pedido).
CREATE OR REPLACE FUNCTION public.enforce_launch_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'launch_lock' AND value = 'true')
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  THEN
    RAISE EXCEPTION 'Los pedidos online están desactivados hasta el lanzamiento.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_launch_lock ON public.orders;
CREATE TRIGGER trg_enforce_launch_lock
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_lock();

-- 3) COMPROBACIÓN
SELECT key, value FROM public.app_settings WHERE key = 'launch_lock';
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_enforce_launch_lock';

-- -----------------------------------------------------------------------------
-- (Opcional) Solo si el diagnóstico del paso 0 muestra que cualquiera puede
-- escribir en app_settings: limitar la escritura a administradores.
-- Revisar antes los nombres de las políticas existentes para no duplicarlas.
--
-- ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "app_settings lectura publica" ON public.app_settings
--   FOR SELECT USING (true);
-- CREATE POLICY "app_settings escritura admin" ON public.app_settings
--   FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin))
--   WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));
-- -----------------------------------------------------------------------------

-- =============================================================================
-- VUELTA ATRÁS
--   Abrir el lanzamiento (sin desplegar):  botón del admin, o
--     UPDATE public.app_settings SET value = 'false' WHERE key = 'launch_lock';
--   Retirar el bloqueo de servidor por completo:
--     DROP TRIGGER IF EXISTS trg_enforce_launch_lock ON public.orders;
--     DROP FUNCTION IF EXISTS public.enforce_launch_lock();
-- =============================================================================
