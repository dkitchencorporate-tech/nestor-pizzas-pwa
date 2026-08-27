-- Creación de la nueva entidad de Subcategorías
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT,
    description_en TEXT,
    img_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Public read access for subcategories" ON public.subcategories
    FOR SELECT TO public USING (true);

-- Políticas de escritura para admin
CREATE POLICY "Admin write access for subcategories" ON public.subcategories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Añadir soporte en la tabla de productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Notificar a Supabase en tiempo real (Opcional, si queremos que la UI escuche)
ALTER PUBLICATION supabase_realtime ADD TABLE subcategories;
