# 🍕 ARCHIVO DE RELEVO Y AUDITORÍA MAESTRA: NÉSTOR PIZZAS PWA
> ⚠️ **[DOCUMENTO DESACTUALIZADO / OBSOLETO — NO USAR]**  
> Este documento contiene estados preliminares que han sido superados por las últimas sesiones.  
> **Para el estado oficial, arquitectura vigente y directivas actualizadas, consulte exclusivamente:**  
> 👉 [DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md](./DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md)

**Documento de Traspaso Operativo / Handoff Técnico para Retomar el Proyecto (Histórico)**  
**Fecha de Generación Original:** 21 de Agosto de 2026  
**Ubicación del Proyecto:** `/root/workspace/nestor-pizzas-pwa`  
**Cliente:** Néstor Pizzas (Caniles & Baza, Granada)  
**Desarrollado y Supervisado por:** Architect.Sys  
**Servidor de Desarrollo Local:** Activo y Escuchando en `http://localhost:5174/` (Red: `http://167.233.37.149:5174/`)  
**Backend / Base de Datos:** Supabase Cloud (`https://jlchjamoejkzahaeimec.supabase.co`)

---

## 📌 1. ESTADO ACTUAL DEL SERVIDOR Y ENTORNO LOCAL

* **Estado del Servidor:** **100% OPERATIVO Y ACTIVO** en segundo plano (Vite v8.2.1).
* **URLs de Acceso Inmediato:**
  * **App PWA Cliente:** `http://localhost:5174/`
  * **Panel de Cocina / Kiosco Mostrador / Administración:** `http://localhost:5174/admin`
  * **Acceso desde Red Local / Móvil en la misma red:** `http://167.233.37.149:5174/`
* **Compilación:** `npm run build` verificado exitosamente (~500ms, 0 vulnerabilidades, TypeScript tipado).
* **Comando para reiniciar el servidor si se apaga el equipo:**
  ```bash
  cd /root/workspace/nestor-pizzas-pwa
  npm run dev -- --host 0.0.0.0 --port 5173
  ```

---

## 🏛️ 2. ARQUITECTURA TECNOLÓGICA Y STACK COMPLETO

### Frontend & UI/UX
* **Core:** React 19 + TypeScript + Vite 8.
* **Estilizado:** Tailwind CSS v4 + Google Fonts (*Outfit* para títulos gastronómicos de impacto y *Plus Jakarta Sans* para legibilidad de alta gama).
* **Sanitización & Seguridad:** `dompurify` para inyección segura de ingredientes destacados en las descripciones sin riesgo XSS.
* **PWA & Modo Offline:** Service Worker (`sw.js`) configurado con estrategia **Network-First** con bypass total de caché HTTP para obtener siempre el catálogo y precios frescos, utilizando la caché local exclusivamente ante pérdida de conexión.

### Gestión de Estado Global (Zustand 5 + LocalStorage Persistence)
1. **`useCartStore` (`src/store/cartStore.ts`):** Carrito de compra del cliente web. Cuenta con auto-limpieza automática tras 15 minutos de inactividad.
2. **`useAuthStore` (`src/store/authStore.ts`):** Manejo de sesiones con Supabase Auth, datos del perfil VIP (`profiles`), historial de pedidos y listener en tiempo real de cambios de estado.
3. **`useKioskCartStore` (`src/store/kioskCartStore.ts`):** Carrito independiente aislado para la toma de comandas físicas en mostrador desde `/admin`.
4. **`useGuestOrderStore` (`src/store/guestOrderStore.ts`):** Persistencia de pedidos realizados por usuarios invitados sin cuenta.
5. **`useI18nStore` (`src/store/i18nStore.ts`):** Internacionalización instantánea (Español 🇪🇸 / Inglés 🇬🇧) con soporte para textos dinámicos del catálogo.

### Backend, Base de Datos & Realtime (Supabase Cloud)
* **URL:** `https://jlchjamoejkzahaeimec.supabase.co`
* **Tablas Principales:**
  * `categories`: Categorías oficiales con subtítulos y orden de clasificación (`sort_order`).
  * `products`: Catálogo completo con flags `is_active` para el Kill-Switch de cocina.
  * `ingredients`: 28 ingredientes oficiales del flyer.
  * `upsells`: Relación de productos estratégicos para la pasarela intermedia previa al checkout.
  * `profiles`: Extensión de `auth.users` con campos `points`, `phone`, `address` (JSON), `is_admin`.
  * `orders` & `order_items`: Registro histórico y en vivo con detalles de personalización en JSONB.
  * `app_settings`: Parámetros globales (`store_closed` para cierre de emergencia, `saturation_mode` para alerta de alta demanda).
* **Procedimiento Atómico Seguro (`RPC process_checkout`):** Valida precios y existencias directamente en la base de datos para prevenir manipulación maliciosa de importes en el frontend.
* **Canales Realtime:**
  * `realtime_orders`: Notifica a cocina al instante de nuevos pedidos entrantes.
  * `public:products`: Sincroniza el Kill-Switch de productos agotados en todas las pantallas en vivo.
  * `public:app_settings`: Activa/desactiva el modo saturación o cierre de emergencia instantáneamente.

---

## 🍕 3. CATÁLOGO OFICIAL Y PRECIOS MEMORIZADOS (49 ARTÍCULOS 1:1)

### 1. Nuestras Pizzas (18 Variedades — Base Tomate & Mozzarella 33ø)
* **Milanesa (7.00€):** Base margarita o nata + York.
* **Calabresa (8.00€):** Base margarita o nata + York y queso de cabra.
* **Kebab (9.00€):** Base margarita o nata + Cebolla, carne kebab y salsa kebab.
* **Florentina (9.00€):** Base margarita o nata + York, piña y extra de mozzarella.
* **Siciliana (9.00€):** Base margarita o nata + Champiñón, york y atún.
* **Napolitana (9.00€):** Base margarita o nata + Champiñón, bacon y serrano.
* **Veneciana (9.00€):** Base margarita o nata + York, salami y salchichas.
* **Genovesa (9.00€):** Base margarita o nata + Champiñón, gambas y atún.
* **Parmesana 4 Quesos (9.00€):** Base margarita o nata + Mezcla 4 quesos (SIN queso azul).
* **Marinera (9.00€):** Base margarita o nata + Atún, gambas y delicias de mar.
* **Canilera (10.00€):** Base margarita o nata + Serrano, pollo, pimiento verde y alioli gratinado.
* **Toscana (10.00€):** Base margarita o nata + Peperoni, ternera, cebolla y salsa picante.
* **Texana (10.00€):** Base margarita o nata + Bacon, ternera, cebolla y salsa barbacoa.
* **Romana (10.00€):** Base margarita o nata + Champiñón, pimiento rojo, pimiento verde y cebolla.
* **Americana (9.00€):** Base margarita o nata + Bacon, ternera y salsa cheddar.
* **Boloñesa (9.00€):** Base margarita o nata + Salsa boloñesa casera.
* **Calzone Curry (10.00€):** Mozzarella + Pollo al curry.
* **Calzone Carbonara (10.00€):** Mozzarella + Pollo + Salsa carbonara.

### 2. Pizzas Blancas (3 Variedades — Base Nata 33ø)
* **Panna (9.00€):** Nata, mozzarella, champiñón, bacon y pollo.
* **Lionesa (9.00€):** Nata, mozzarella, york, bacon y huevo al horno.
* **Carbonara (9.00€):** Nata, mozzarella, york, bacon y cebolla.

### 3. Nuestras Patatas (4 Variedades)
* **Patatas Fritas (2.50€):** Ración crujiente recién hecha.
* **Patatas Gajos (3.50€):** Con selector de salsa modal (Alioli, Barbacoa, Brava o Morisca).
* **Gratinadas Cheddar (8.00€):** Llevan bacon y salsa cheddar.
* **Gratinadas Morisca (8.00€):** Llevan bacon y salsa cheddar, gratinadas con salsa morisca.

### 4. Para Acompañar (3 Variedades)
* **Nuggets de Pollo (4.00€):** 6 unidades.
* **Roscas de Ingredientes / Aros (4.50€):** 8 unidades.
* **Alitas de Pollo (5.50€):** 6 unidades.

### 5. Categorías Especiales de Pizza
* **Por Ingredientes:** Base Pizza Margarita 33cm a **6.00€** + selector abierto de 28 ingredientes oficiales a **+1.00€/ingrediente**.
* **Mazzi Pizzas:** Mazzi Pizza Base 31cm a **9.50€** (cinco quesos y lámina de masa).

### 6. Algo Más (7 Especialidades)
* **Spaguetti Boloñesa (7.00€)**
* **Spaguetti Carbonara (7.00€)**
* **Pollo al Curry con Arroz (9.50€)**
* **Pizza Dulce (5.50€)**
* **Burguer Crujiente (7.40€):** Pollo crujiente, lechuga, cheddar en loncha y bacon.
* **Bocata Extremeño (8.40€):** Escalope de pollo, bacon, cheddar en loncha y salsa morisca.
* **Bocata Serranito (8.40€):** Escalope de lomo, pimiento verde, jamón serrano y salsa alioli.

### 7. Secret Burguer (3 Hamburguesas Gourmet — 10.40€ c/u)
* **Cheddar Love (10.40€):** 100g de ternera, cheddar, bacon y salsa cheddar.
* **Cabrona (10.40€):** 100g de ternera, queso de cabra, cebolla caramelizada y salsa miel-mostaza.
* **Pulled BBQ (10.40€):** 100g de ternera, cheddar, pulled pork y salsa BBQ.

### 8. Bebidas (7 Referencias)
* Agua Pequeña (1.00€), Agua 1.5L (1.50€), Refrescos Lata (1.50€), Cerveza Lata (1.50€), Aquarius (1.60€), Cerveza Litro (2.50€), Refresco 2 Litros (3.00€).

### 9. Promociones
* **Jueves Locos (11.00€):** 2 Pizzas por 11€ (activo únicamente los jueves mediante configurador modal).

---

## 🎯 4. REGLAS DE NEGOCIO, EMBUDO & KITCHEN POS

1. **Geolocalización & Cobertura:** Reparto a domicilio limitado a **10 km** respecto a Caniles mediante API Geolocation del navegador, con **bypass automático** si el usuario introduce el código postal oficial `18810`.
2. **Pedido Mínimo:** 12.00€ para entrega a domicilio. Si el importe es menor, se solicita confirmación de recargo de 1.50€.
3. **Club VIP & Fidelización:**
   * Canje de 25 puntos acumulados por el artículo de mayor valor del carrito gratis (pizza o hamburguesa).
   * Acumulación automática de +4 puntos por cada 10€ de pedido.
4. **Horarios & Franjas:** Generador inteligente de tramos de 15 minutos ([`timeUtils.ts`](file:///root/workspace/nestor-pizzas-pwa/src/utils/timeUtils.ts)) respetando horarios de apertura del restaurante.
5. **Kitchen POS (`/admin`):**
   * Alarma acústica en bucle persistente ante nuevos pedidos pendientes.
   * Modificadores de tiempo en comanda (+15 min / +30 min).
   * Generador de tickets de 80mm listos para imprimir en impresoras térmicas ESC/POS.
   * TPV Kiosco táctil con buscador de clientes por teléfono.
   * Kill-Switch en vivo para pausar productos agotados.
   * Cierre de Emergencia y Modo Saturación (+1h de espera).

---

## 📋 5. MATRIZ DE CORRECCIONES PENDIENTES PARA LA PRÓXIMA SESIÓN

A partir de las notas previas y el archivo `CHECKLIST.md`, los puntos identificados para afinar cuando retomemos son:

1. **Pizzas Tradicionales & Blancas (Módulo 4):**
   - Asegurar que no existan configuradores innecesarios de mitades en pizzas de 1 sabor, dejando un campo directo de "Nota para cocina" (ej. "Sin cebolla", "Muy tostada").
   - Verificar que en Pizzas Blancas no figure ninguna mención errónea a "sin gluten".
   - Confirmar fotografía de la Pizza 4 Quesos (versión sin queso azul).
2. **Patatas Gajo & Gratinadas:**
   - Confirmar que el selector de salsa funcione fluido con sus costes y notas.
   - Reflejar en la descripción de Patatas Gratinadas que llevan bacon y salsa cheddar.
3. **Sección Algo Más:**
   - Asegurar que no quede ningún texto heredado de "desayunos" o "reservas".
4. **Afinación de la Pasarela de Pago:**
   - Mantener el flujo exclusivo de Pago con Tarjeta TPV / SumUp como pasarela predeterminada.

---

## 📁 6. MAPA DE ARCHIVOS CLAVE EN EL REPOSITORIO

* **Punto de entrada:** [`src/App.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/App.tsx)
* **Catálogo Cliente:** [`src/features/catalog/Catalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/catalog/Catalog.tsx)
* **Checkout:** [`src/components/CheckoutModal.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/CheckoutModal.tsx)
* **Datos del Catálogo:** [`src/data/products.ts`](file:///root/workspace/nestor-pizzas-pwa/src/data/products.ts)
* **Monitor de Cocina:** [`src/features/admin/AdminOrders.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminOrders.tsx)
* **TPV Kiosco:** [`src/features/admin/AdminKiosk.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminKiosk.tsx)
* **Gestión de Productos/Kill-Switch:** [`src/features/admin/AdminCatalog.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/features/admin/AdminCatalog.tsx)
* **Impresión Térmica:** [`src/components/TicketPrinter.tsx`](file:///root/workspace/nestor-pizzas-pwa/src/components/TicketPrinter.tsx)
* **Service Worker:** [`sw.js`](file:///root/workspace/nestor-pizzas-pwa/sw.js)
* **Informe Completo en el Repo:** [`nestor-pizzas-pwa/audit_report/REPORTE_AUDITORIA_INTEGRAL_NESTOR_PIZZAS_PWA.md`](file:///root/workspace/nestor-pizzas-pwa/audit_report/REPORTE_AUDITORIA_INTEGRAL_NESTOR_PIZZAS_PWA.md)

---
*Archivo de Relevo generado para el espacio de trabajo de Alex Rosales — Architect.Sys 2026.*
