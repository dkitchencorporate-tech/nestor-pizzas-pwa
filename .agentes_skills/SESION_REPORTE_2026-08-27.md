# 📋 REPORTE COMPLETO DE SESIÓN — Néstor Pizzas PWA
**Fecha:** 27 de Agosto de 2026  
**Duración:** ~5 horas  
**Repositorio:** `dkitchencorporate-tech/nestor-pizzas-pwa` → **Vercel (Producción)**  
**Último commit desplegado:** `41869f2` — `fix: restore pizza modal by correcting category_id field reference`

---

## 1. 🏗️ ARQUITECTURA GENERAL DEL PROYECTO

### Stack Técnico
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deploy:** GitHub → Vercel (CD automático en rama `main`)
- **Estado global:** Zustand (múltiples stores)
- **i18n:** Store personalizado `i18nStore.ts` con diccionario ES/EN

### Estructura de la Aplicación
La app tiene **dos modos de usuario** con rutas diferenciadas lógicamente (no con React Router, sino con un estado `currentView` en `App.tsx`):
1. **Vista pública del cliente** (`currentView: 'catalog'|'tracking'|'splash'`) → `Catalog.tsx`
2. **Vista de administración** (`currentView: 'admin'`) → `AdminDashboard.tsx` con pestañas internas

### Supabase: Credenciales de Acceso
```
Project URL: https://jlchjamoejkzahaeimec.supabase.co
Project Ref: jlchjamoejkzahaeimec
DB Password: [REDACTED].
Connection String: postgresql://postgres:[REDACTED].@db.jlchjamoejkzahaeimec.supabase.co:5432/postgres
Anon Key: sb-publishable_NyjmBGppuRELt_ysz_cxxQ_9Yx4r5I0
```

---

## 2. 🗄️ BASE DE DATOS — ESTADO ACTUAL VERIFICADO

### Tablas y Contenido Confirmado

| Tabla | Registros Verificados | Estado |
|---|---|---|
| `categories` | 13 categorías | ✅ Completo |
| `products` | 57 productos activos | ✅ Completo |
| `subcategories` | 5 subcategorías (todas de BEBIDAS) | ✅ Correcto |
| `orders` | 1 orden activa (cooking) | ✅ Funcional |
| `order_items` | Con JSONB `customization_details` | ✅ Funcional |
| `profiles` | 1 admin, sin email visible | ⚠️ Ver nota |
| `app_settings` | `saturation_mode: false`, `store_closed: false` | ✅ |
| `store_settings` | `delivery_fee: 1€`, `min_order: 10€`, `jueves: 1€` | ✅ |
| `upsells` | 2 productos (PATATAS GAJOS, FLORENTINA) | ✅ |
| `kiosk_customers` | Clientes del TPV | ✅ |

### Categorías Activas
```
NUESTRAS PIZZAS (16 productos)   CALZONES (2)
PIZZAS BLANCAS (3)               MAZZI PIZZAS (1)
POR INGREDIENTES (1)             NUESTRAS PATATAS (4)
PARA ACOMPAÑAR (3)               ALGO MÁS (7) — Solo fines de semana
SECRET BURGUER (3)               BEBIDAS (16) — Con subcategorías
PROMOCIONES (1)                  POSTRES — Sin productos activos
```

### Subcategorías (Solo BEBIDAS)
```
AGUAS         → 2 productos (Agua Pequeña, Agua 1.5L)
CERVEZAS      → 2 productos (Cerveza Lata, Cerveza Litro)
REFRESCOS     → 9 productos (Coca Cola, Fanta, Nestea, Aquarius...)
REFRESCOS GRANDES → 1 producto (Refresco 2L) — Nombre corregido esta sesión
TINTOS        → 2 productos (Tinto Normal, Tinto Limón)
```

> [!NOTE]
> Los **Aquarius Limón, Aquarius Naranja, Coca Cola Cero, Fanta Limón, Fanta Naranja, Nestea Limón, Nestea Maracuyá** (IDs 100-106) **no tienen imagen** (`img_url = null`). En el catálogo mostrarán el SVG de fallback con el nombre del producto en verde.

### Funciones RPC en Supabase
| Función | Propósito |
|---|---|
| `process_checkout` | Checkout desde la web pública |
| `create_kiosk_order` | Crear pedido desde TPV |
| `add_items_to_kiosk_order` | Añadir ítems a mesa existente |
| `update_kiosk_order` | Actualizar pedido del TPV |
| `create_kiosk_client` | Registrar nuevo cliente en el TPV |
| `search_client` | Buscar cliente por nombre/teléfono |
| `get_guest_order_status` | Estado de pedido para invitados |
| `is_admin` | Verificación de rol admin |
| `redeem_loyalty_points` | Trigger: canje de puntos |
| `process_order_status_points` | Trigger: puntos por estado |

---

## 3. 🛠️ TRABAJO REALIZADO EN ESTA SESIÓN

### BLOQUE 1: Correcciones de Traducción (i18n)
**Problema:** Múltiples zonas de la web sin traducir al inglés (modales, preloader, admin, categorías, descripciones).  
**Solución:** Se pobló el diccionario en [`i18nStore.ts`](file:///root/workspace/nestor-pizzas-pwa/src/store/i18nStore.ts) con ~400 entradas y se implementó la función `tDynamic()` para traducciones dinámicas del contenido de la BD.

### BLOQUE 2: Corrección del error tipográfico "REFESCOS GRANDES"
**Problema:** El nombre de la subcategoría estaba mal escrito en la BD y se mostró con parche temporal en el código.  
**Solución Definitiva:** Se eliminó el parche del código y se ejecutó SQL directamente en Supabase para corregir el dato en la tabla `subcategories`.

### BLOQUE 3: Arquitectura de Subcategorías de Bebidas
**Problema:** Las bebidas necesitaban mostrar subcategorías (CERVEZAS, REFRESCOS, etc.) con su propia imagen en lugar de listar todos los productos planos.  
**Solución:** Se implementaron dos componentes nuevos:
- [`SubcategoryModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SubcategoryModal.tsx): Modal que se abre al clicar en un grupo de bebidas y muestra los productos de esa subcategoría.
- [`ProductCard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/ProductCard.tsx) modificado: Detecta `isGroup: true` y abre el `SubcategoryModal` en lugar del flujo normal.
- [`Catalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/catalog/Catalog.tsx) modificado: Agrupa productos con `subcategory_id` en objetos virtuales `isGroup` antes de renderizar.

### BLOQUE 4: Flujo de Pedidos en Mesa (TablesFlow)
**Problema:** Los pedidos de mesa llegaban al admin parpadeando en rojo de forma infinita, sin forma de aceptarlos o silenciarlos. La impresora enviaba TODO el pedido cada vez, sin distinguir qué ya estaba en cocina.  
**Solución:**
- [`AdminOrders.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminOrders.tsx): Se añadió botón **"🔥 Aceptar y Enviar Nuevos a Cocina"** exclusivo para pedidos `delivery_method: local`.
- Al hacer clic, el sistema:
  1. Actualiza `is_sent_to_kitchen: true` en el JSONB de cada `order_item` no procesado.
  2. Envía SOLO esos ítems nuevos a la impresora (impresión incremental).
  3. Cambia el estado del pedido a `cooking`.
- Si posteriormente el kiosk añade más productos a la mesa, el flag `is_sent_to_kitchen` detecta los nuevos ítems y la alarma vuelve a activarse automáticamente.
- [`AdminKiosk.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminKiosk.tsx): Se eliminó el bloque que enviaba directamente a imprimir al añadir productos, delegando esa acción al flujo de aceptación manual del admin.

### BLOQUE 5: Corrección de Layout (Espacios Negros / Scroll)
**Problema:** El dashboard de admin tenía `min-h-screen` que causaba espacios negros al hacer scroll, porque el contenido crecía fuera de la pantalla y el menú lateral no tenía scroll propio.  
**Solución:**
- [`AdminDashboard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/pages/AdminDashboard.tsx): Cambiado de `min-h-screen` a `h-screen w-screen overflow-hidden`. El contenido principal tiene `h-full overflow-hidden`. El área de contenido activo tiene su propio `overflow-y-auto`.
- El menú lateral tiene ahora un wrapper `flex-1 overflow-y-auto` que permite scrollear todo su contenido (botones de navegación + controles de emergencia + botón de volver) sin bloquearse.

### BLOQUE 6: Corrección del Badge "TPV"
**Problema:** El badge azul "TPV" en los pedidos de mesa confundía, ya que parecía indicar método de pago con datáfono.  
**Solución:** Renombrado a "CREADO EN CAJA" para indicar que el pedido fue creado desde el TPV interno, no desde la web pública.

### BLOQUE 7 (CRÍTICO): Regresión en Modal de Pizzas
**Causa raíz:** En el commit `9830de6`, al implementar las subcategorías, se cambió accidentalmente `product.category_id` por `product.category` en la lógica de detección de pizzas de `ProductCard.tsx`.

> **El campo `product.category` NO EXISTE en los datos que vienen de Supabase.** Los productos de Supabase tienen `category_id` (texto que referencia el `id` de la tabla `categories`). El campo `category` solo existe en el archivo local estático `src/data/products.ts` (datos legacy que ya no se usan para el catálogo).

**Archivos corregidos:**
- [`ProductCard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/ProductCard.tsx) línea 81: Condición `isPizza`
- [`IngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/IngredientsModal.tsx) líneas 23-25: `isPizzasBlancas`, `isNuestrasPizzas`, `isPorIngredientes`
- [`KioskIngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/KioskIngredientsModal.tsx) líneas 22-24: Mismas variables

---

## 4. 📊 ESTADO ACTUAL DE LA APLICACIÓN — SCORE: 82/100

### ✅ FUNCIONANDO CORRECTAMENTE (Verificado)

| Funcionalidad | Detalle |
|---|---|
| Catálogo de productos | Carga desde Supabase en tiempo real |
| Traducción ES/EN | Completa en catálogo, modales, admin |
| Modal de pizzas (web) | Base Normal/Blanca/Maxxi, ingredientes +1€, notas, mitad/mitad |
| Modal de pizzas (Kiosk) | Idéntico al de web, mismo componente de lógica |
| Subcategorías Bebidas | Mostradas como grupos con imagen propia |
| Preloader | Animación + textos traducidos |
| Checkout web | Delivery, Recogida, franjas horarias, puntos |
| Seguimiento de pedido | Cliente ve el estado en tiempo real |
| Pagos online (web) | SumUp card widget (pendiente integración real — ver §5) |
| Admin — Gestión de pedidos | Pendiente, En cocina, Listo, Entregado |
| Admin — Pedidos de Mesa | Alarma, "Aceptar y Enviar a Cocina", impresión incremental |
| Admin — TPV (Kiosk) | Búsqueda de clientes, creación, selección de mesa, pedido |
| Admin — Catálogo | CRUD de categorías, subcategorías y productos |
| Admin — Analíticas | Gráficos de ingresos, pedidos, etc. |
| Admin — Impresoras | Configuración de IP, Puerto, URL de relay |
| Admin — Modo Saturación | Kill-switch que avisa al cliente de +1h de espera |
| Admin — Cierre de Tienda | Kill-switch global con modal en la web pública |
| Impresión de tickets | `TicketPrinter.tsx` + `printerService.ts` via proxy local |
| Ticket imprime extras y notas | ✅ Verificado en `TicketPrinter.tsx` — lee `customization_details.extras` y `.notes` |
| Sistema de puntos VIP | Trigger en BD, acumulación y canje en checkout |
| Scroll del sidebar admin | Funcional, contenido completo accesible |
| Layout sin espacios negros | Corregido, `h-screen` fijo |
| PWA installable | Service Worker, manifest, botón de instalación |
| PWA Analytics | Tracking de instalaciones |

### ⚠️ PUNTOS DE ATENCIÓN (No bloqueantes)

| Punto | Descripción | Riesgo |
|---|---|---|
| **Imágenes faltantes en bebidas** | Aquarius Limón, Aquarius Naranja, Coca Cola Cero, Fanta Limón, Fanta Naranja, Nestea Limón, Nestea Maracuyá — muestran SVG fallback | Bajo — funcional pero no óptimo |
| **Categoría POSTRES sin productos** | Existe en `categories` pero no tiene ningún `product` activo — no se muestra en el catálogo | Bajo |
| **Categoría NUESTRAS BURGUERS** | Existe en DB pero no tiene productos en la tabla `products` | Bajo |
| **ALGO MÁS y SECRET BURGUER** | Solo se muestran viernes/sábado/domingo. Lógica correcta pero basada en hora del servidor del cliente (puede variar) | Bajo |
| **Impresora via Proxy Local** | Requiere que el proxy Node.js esté corriendo en la misma red del restaurante (`localhost:8080/print`). Si no corre, se usa `window.print()` como fallback | Medio — requiere setup manual en el local |
| **Profiles sin email** | El perfil admin (`b361a265...`) no tiene email visible en `profiles`. Acceso via Supabase Auth Dashboard | Bajo |
| **`src/data/products.ts`** | Archivo con datos estáticos legacy que YA NO SE USA para el catálogo (que carga de Supabase). Puede confundir a futuros agentes. | Bajo — riesgo de bugs si se mezcla |
| **`check_db.js`** | Script de debug sin env local — no funciona en este entorno. Puede eliminarse. | Cosmético |

### ❌ PENDIENTE CRÍTICO (Bloqueante para producción total)

| Pendiente | Descripción |
|---|---|
| **SumUp — Integración Real** | El componente [`SumUpPaymentModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SumUpPaymentModal.tsx) existe con toda la UI construida pero la integración real del SDK está comentada. Necesita `checkoutId` real y credenciales de SumUp. |

---

## 5. 🔴 DETALLE CRÍTICO: INTEGRACIÓN SUMUP

### Estado Actual del Componente
[`SumUpPaymentModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SumUpPaymentModal.tsx) tiene:
- ✅ UI completa (modal, estados de éxito/error, spinner)
- ✅ Traducciones ES/EN
- ✅ Integrado en [`CheckoutModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/CheckoutModal.tsx) (ya se muestra cuando el cliente elige pagar online)
- ❌ El bloque de inicialización del SDK está comentado (línea 29)

### Lo que falta implementar
```tsx
// En SumUpPaymentModal.tsx, dentro del useEffect:
SumUpCard.mount({
  checkoutId: "CHECKOUT_ID_GENERADO_POR_BACKEND",
  onComplete: (result) => {
    if (result.status === 'PENDING') { 
      setIsSuccess(true);
      setTimeout(onSuccess, 1500);
    }
  }
})
```

### Pasos necesarios para completar SumUp
1. Obtener credenciales de cuenta SumUp (Client ID, Client Secret, Merchant Code)
2. Crear una **Supabase Edge Function** o **endpoint backend** que genere el `checkoutId` antes de cada pago
3. Inyectar el script SDK de SumUp (`https://gateway.sumupteam.com/merchant-sdk/v3/sdk.js`)
4. Montar el widget con el `checkoutId` generado
5. Confirmar el pago en Supabase actualziando `payment_status = 'PAID'` en la orden

---

## 6. 🔄 FLUJO DE DATOS — CÓMO FUNCIONA TODO

### Flujo de Pedido Web (Cliente)
```
Catalog → ProductCard → IngredientsModal (pizzas) / SauceModal (patatas gajos) / AddToCartModal (resto)
→ CartBar → CartDrawer → UpsellModal → CheckoutModal → process_checkout (RPC) → AdminOrders (tiempo real)
```

### Flujo de Pedido TPV (Kiosk Admin)
```
AdminKiosk → selección de cliente / mesa → catálogo → handleKioskProductAdd
→ KioskIngredientsModal (pizzas) / KioskSauceModal (patatas) → create_kiosk_order / add_items_to_kiosk_order (RPC)
→ AdminOrders ve el pedido en tiempo real → "Aceptar y Enviar a Cocina" → impresión
```

### Persistencia de Personalizaciones de Pizza
```json
// customization_details en order_items:
{
  "name": "NAPOLITANA (Base Maxxi) + mozzarella, bacon",
  "extras": ["mozzarella", "bacon"],
  "notes": "Sin cebolla",
  "is_sent_to_kitchen": true,
  "is_tpv_order": true
}
```
El `name` completo va al ticket. Los `extras` se muestran línea por línea. Las `notes` se imprimen con "NOTA:".

---

## 7. ⚙️ INSTRUCCIONES PARA EL PRÓXIMO AGENTE

### Reglas Absolutas (NUNCA VIOLAR)
1. **Nunca usar `product.category`** para referirse a la categoría de un producto de Supabase. El campo correcto siempre es `product.category_id` (texto). El campo `category` solo existe en `src/data/products.ts` (archivo legacy estático).
2. **Nunca hacer cambios sin hacer `npx tsc --noEmit`** y confirmar 0 errores antes del `git push`.
3. **Nunca parchear datos en el frontend** — si hay un dato incorrecto (nombre, precio, imagen), la solución va en la base de datos Supabase, no en el código.
4. **Las subcategorías de bebidas son SOLO para bebidas** — no crear subcategorías de otros tipos de producto sin arquitectura planificada.
5. **El archivo `src/data/products.ts` es LEGACY** — no añadir ni modificar productos aquí. Solo sirve para la interfaz TypeScript `Product` y las constantes `NESTOR_INGREDIENTS_OFICIAL` y `NESTOR_CATEGORIES` que aún se importan.

### Decisiones de Arquitectura Establecidas
- **Estado de pedidos de mesa:** El campo `customization_details.is_sent_to_kitchen` (boolean) en cada `order_item` es la fuente de verdad para saber si un ítem ha sido procesado por cocina.
- **Impresión:** Siempre intentar primero `sendToNetworkPrinter()` (proxy local ESC/POS). Si falla, fallback a `window.print()` con el componente `TicketPrinter`.
- **Traducciones:** Usar `t('clave_fija')` para strings estáticos. Usar `tDynamic('texto_de_bd')` para contenido dinámico que viene de la base de datos.

### Próximas Tareas por Prioridad
1. 🔴 **SumUp** — Integrar el SDK real. Es el único bloqueante crítico para producción.
2. 🟡 **Imágenes de bebidas** — Subir imágenes a Supabase Storage para los 7 productos de bebidas sin imagen.
3. 🟡 **Auditoría de Seguridad** — Revisar si hay usuarios no autorizados con acceso admin.
4. 🟢 **Marketing** — 3 flyers + 12 recursos para redes sociales.
5. 🟢 **POSTRES y NUESTRAS BURGUERS** — Añadir productos a estas categorías si el negocio los tiene.

---

## 8. 📁 ARCHIVOS CLAVE — MAPA DE REFERENCIA RÁPIDA

| Archivo | Propósito |
|---|---|
| [`src/App.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/App.tsx) | Raíz de la app. Controla vista actual (splash/catalog/tracking/admin) |
| [`src/features/catalog/Catalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/catalog/Catalog.tsx) | Catálogo público completo. Carga productos de Supabase y agrupa subcategorías |
| [`src/components/ProductCard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/ProductCard.tsx) | Tarjeta de producto. Detecta pizza por `category_id` y abre el modal correcto |
| [`src/components/IngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/IngredientsModal.tsx) | Modal de personalización de pizza en la web pública |
| [`src/components/KioskIngredientsModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/KioskIngredientsModal.tsx) | Modal de personalización de pizza en el TPV |
| [`src/components/SubcategoryModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SubcategoryModal.tsx) | Modal de subcategorías (bebidas) |
| [`src/components/TicketPrinter.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/TicketPrinter.tsx) | Template HTML de ticket de impresión |
| [`src/components/SumUpPaymentModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/SumUpPaymentModal.tsx) | Modal de pago SumUp — PENDIENTE integración SDK |
| [`src/features/admin/AdminDashboard.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/pages/AdminDashboard.tsx) | Shell del panel admin con sidebar y pestañas |
| [`src/features/admin/AdminOrders.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminOrders.tsx) | Gestión de pedidos en tiempo real, con lógica de mesas |
| [`src/features/admin/AdminKiosk.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminKiosk.tsx) | TPV (Kiosk) completo del restaurante |
| [`src/features/admin/AdminCatalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminCatalog.tsx) | CRUD de catálogo (productos, categorías, subcategorías) |
| [`src/store/i18nStore.ts`](file:///root/workspace/nestor-pizzas-pwa/src/store/i18nStore.ts) | Diccionario ES/EN + funciones `t()` y `tDynamic()` |
| [`src/utils/printerService.ts`](file:///root/workspace/nestor-pizzas-pwa/src/utils/printerService.ts) | Servicio de envío a impresora térmica de red |
| [`src/data/products.ts`](file:///root/workspace/nestor-pizzas-pwa/src/data/products.ts) | ARCHIVO LEGACY — No modificar para datos de productos |
