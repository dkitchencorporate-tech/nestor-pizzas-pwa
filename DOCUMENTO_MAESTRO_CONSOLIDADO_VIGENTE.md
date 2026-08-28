# 🍕 DOCUMENTO MAESTRO CONSOLIDADO Y DIRECTIVA TÉCNICA OFICIAL (VIGENTE 2026)
## PROYECTO: NÉSTOR PIZZAS PWA (CANILES & BAZA, GRANADA)

> 🟢 **ESTADO DEL DOCUMENTO:** VIGENTE / FUENTE OFICIAL DE VERDAD  
> **Última Actualización:** 28 de Agosto de 2026  
> **Ubicación del Proyecto:** `/root/workspace/nestor-pizzas-pwa`  
> **Entorno de Producción:** Vercel SPA (`https://nestorpizzas.es` / `/admin`)  
> **Backend / BaaS:** Supabase Cloud (`https://jlchjamoejkzahaeimec.supabase.co`)  
> **Infraestructura VM:** Hetzner Cloud (Núremberg, Alemania) — Ubuntu 24.04 LTS / 32GB RAM / 16 vCPU  

---

## 🛑 REGLAS DE ORO INQUEBRANTABLES PARA CUALQUIER AGENTE (MANDATORY GUARDRAILS)

Cualquier agente de IA o desarrollador que opere en este repositorio **DEBE RESPETAR ESTAS 6 REGLAS**:

1. **PROPIEDAD DE CATEGORÍA:** Usar SIEMPRE `product.category_id` (tipo `string` que referencia la tabla `categories` de Supabase). **NUNCA usar `product.category`** ya que ese campo no existe en Supabase y rompe la apertura de los modales de pizzas.
2. **ARCHIVO LEGACY:** El archivo `src/data/products.ts` es **ESTÁTICO Y LEGACY**. No modificar ni agregar productos allí. Todo el catálogo se carga y gestiona dinámicamente desde Supabase. Solo se usa para tipado TypeScript y constantes de fallback.
3. **VALIDACIÓN TYPESCRIPT:** Antes de dar por finalizada una tarea o hacer commit, es **OBLIGATORIO** ejecutar `npx tsc --noEmit` y confirmar **0 errores**.
4. **INTEGRIDAD DE DATOS:** Nunca parchear datos erróneos de productos (precios, nombres, fotos) en el código frontend. Las correcciones de datos van directamente en la base de datos Supabase mediante scripts SQL o panel Admin.
5. **ESTADO DE COCINA EN MESAS:** La fuente de verdad para saber si un plato de una mesa fue enviado a cocina es el campo booleano `customization_details.is_sent_to_kitchen` dentro del JSONB de cada fila de `order_items`.
6. **IMPRESIÓN ESC/POS:** El flujo de impresión térmica primero intenta enviar a la impresora de red mediante el proxy local (`printerService.ts`). Si no responde, ejecuta el fallback estándar con `window.print()` y el template de [TicketPrinter.tsx](file:///root/workspace/nestor-pizzas-pwa/src/components/TicketPrinter.tsx).

---

## 🔐 1. UBICACIÓN DE CREDENCIALES SENSIBLES Y APIS

Toda la información sensible, credenciales de conexión y accesos administrativos del proyecto están centralizados de forma segura en:

* 📁 **Carpeta de Credenciales:** `/root/Desktop/indicaciones/`
  * 📄 `Credenciales_Supabase_Nestor_Pizzas.pdf`: Contiene las API Keys (Anon, Service Role), Connection String de PostgreSQL y contraseña de base de datos.
  * 📄 `GUIA_DIRECTIVA_OPTIMIZACION_Y_CORRECCION_AGENTE.pdf`: Directiva de configuración del entorno Hetzner.
  * 📄 `INFORME_FINAL_SESION_NESTOR_PIZZAS.pdf`: Memoria técnica de la sesión previa.
* 📄 **Variables de Entorno del Proyecto:** [`.env`](file:///root/workspace/nestor-pizzas-pwa/.env)
  * `VITE_SUPABASE_URL=https://jlchjamoejkzahaeimec.supabase.co`
  * `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🛠️ 2. RESUMEN DE MEJORAS Y ARQUITECTURA YA IMPLEMENTADAS

El sistema cuenta con un índice de madurez de **82/100** con los siguientes módulos 100% funcionales y verificados:

### A. Sistema de Traducción Dinámica (i18n)
* **Archivo:** [`src/store/i18nStore.ts`](file:///root/workspace/nestor-pizzas-pwa/src/store/i18nStore.ts)
* Diccionario completo con ~400 entradas para Español 🇪🇸 e Inglés 🇬🇧.
* Soporte para `t('clave_estatica')` y `tDynamic('texto_desde_supabase')` para traducir automáticamente categorías, nombres y descripciones que vienen de la base de datos.

### B. Subcategorías de Bebidas (Arquitectura Modular)
* **Componentes:** [`src/components/SubcategoryModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SubcategoryModal.tsx), [`src/components/ProductCard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/ProductCard.tsx), [`src/features/catalog/Catalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/catalog/Catalog.tsx).
* Las bebidas se agrupan en tarjetas visuales de grupo (`CERVEZAS`, `REFRESCOS`, `REFRESCOS GRANDES`, `TINTOS`, `AGUAS`). Al hacer clic en un grupo, se abre el modal de subcategoría con sus productos individuales.
* El error tipográfico de `"REFRESCOS GRANDES"` fue corregido directamente en la tabla `subcategories` de Supabase.

### C. Flujo de Comandas de Mesa en Cocina (TablesFlow)
* **Archivo:** [`src/features/admin/AdminOrders.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminOrders.tsx)
* Botón destacado **"🔥 Aceptar y Enviar Nuevos a Cocina"** exclusivo para pedidos de tipo `delivery_method: local` (mesas).
* Al hacer clic:
  1. Marca `is_sent_to_kitchen: true` en los ítems no procesados de la comanda.
  2. Imprime únicamente los ítems nuevos de forma incremental.
  3. Pasa el pedido a estado `cooking` y silencia la alarma hasta que se agreguen nuevos platos desde el TPV.

### D. Panel de Administración y Layout Fijo
* **Archivo:** [`src/pages/AdminDashboard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/pages/AdminDashboard.tsx)
* Contenedor con `h-screen w-screen overflow-hidden` que elimina por completo los fondos negros y espacios vacíos.
* Sidebar de navegación lateral con `overflow-y-auto` que garantiza acceso permanente a todas las secciones (Cocina, TPV, Catálogo, Analíticas, Impresoras, Emergencias).

### E. Modales de Selección y Personalización de Pizzas
* **Web Pública:** [`src/components/IngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/IngredientsModal.tsx)
* **TPV Mostrador:** [`src/components/KioskIngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/KioskIngredientsModal.tsx)
* Permite selección de base (Normal / Blanca / Mazzi), selector de 28 ingredientes oficiales a +1.00€ c/u, campo de notas para cocina y división de mitades si aplica.

---

## 🎯 3. MATRIZ DE PENDIENTES Y HOJA DE RUTA RESTANTE

| Prioridad | Tarea / Módulo | Estado | Descripción Técnica |
| :--- | :--- | :---: | :--- |
| 🔴 **CRÍTICA** | **Integración Real SDK SumUp** | ⚠️ UI Lista / SDK Pendiente | Inyectar el script oficial del SDK de SumUp en [`SumUpPaymentModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SumUpPaymentModal.tsx), generar el `checkoutId` mediante endpoint/Edge Function y montar el widget `SumUpCard.mount()`. |
| 🟡 **MEDIA** | **Imágenes de Bebidas en Storage** | ⚠️ Fallback SVG Activo | Subir imágenes PNG a Supabase Storage para los productos con `img_url: null` (IDs 100-106). |
| 🟡 **MEDIA** | **Revisión de Textos Específicos** | ⚠️ Pendiente Verificación | Confirmar que en pizzas blancas no figure mención a "sin gluten" y que la descripción de Patatas Gratinadas detalle "con bacon y salsa cheddar". |
| 🟢 **BAJA** | **Material Gráfico & Marketing** | ⏳ Opcional | Generación de 3 flyers y 12 creatividades para redes sociales. |

---

## 🗄️ 4. ESTRUCTURA DE BASE DE DATOS SUPABASE

### Tablas Principales
* `categories`: Categorías del menú (`id`, `name`, `description`, `sort_order`).
* `subcategories`: Agrupaciones secundarias de bebidas (`id`, `name`, `category_id`, `img_url`).
* `products`: Catálogo completo (`id`, `category_id`, `subcategory_id`, `name`, `description`, `price`, `is_active`, `img_url`).
* `ingredients`: 28 ingredientes oficiales para extras (+1.00€).
* `upsells`: Artículos recomendados para la pasarela previa al checkout.
* `orders` & `order_items`: Registro de pedidos y personalizaciones en JSONB.
* `profiles`: Perfiles de usuarios, puntos VIP (`points`) y rol de administrador (`is_admin`).
* `app_settings`: Claves globales (`store_closed`, `saturation_mode`).

### Procedimientos Almacenados (RPC)
* `process_checkout`: Validación de precios en base de datos e inserción atómica de pedidos web.
* `create_kiosk_order`: Alta de comanda física desde el TPV.
* `add_items_to_kiosk_order`: Adición incremental de ítems a mesas existentes.
* `update_kiosk_order`: Actualización de estado y cobro de pedidos en salón.
* `search_client`: Buscador rápido de clientes por nombre/teléfono en el Kiosk.

---

## 💻 5. COMANDOS OPERATIVOS DEL ENTORNO

```bash
# 1. Validar tipos TypeScript (Obligatorio tras cada cambio)
npx tsc --noEmit

# 2. Iniciar servidor de desarrollo en la VM
npm run dev -- --host 0.0.0.0 --port 5174

# 3. Compilar para producción
npm run build

# 4. Probar endpoints locales de la app
# Web PWA: http://localhost:5174/
# Admin Cocina/TPV: http://localhost:5174/admin
# Acceso por red: http://167.233.37.149:5174/
```

---
*Documento consolidado oficialmente para Architect.Sys y el equipo de desarrollo de Néstor Pizzas PWA.*
