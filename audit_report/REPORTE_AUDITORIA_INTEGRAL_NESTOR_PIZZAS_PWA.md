# 🍕 REPORTE MAESTRO DE AUDITORÍA INTEGRAL DE CÓDIGO & ARQUITECTURA
> ℹ️ **[INFORME DE AUDITORÍA INICIAL / HISTÓRICO]**  
> Para consultar el estado consolidado vigente, reglas inquebrantables y roadmap actual:  
> 👉 [DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md](../DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md)

## PROYECTO: NÉSTOR PIZZAS PWA (CANILES & BAZA)
**Elaborado por:** Dirección Técnica & Arquitectura de Software — **Architect.Sys**  
**Fecha de Auditoría Inicial:** Agosto 2026  
**Entorno de Ejecución Local:** `http://localhost:5174` (Vite v8.2.1 / Node.js / React 19)  
**Despliegue de Producción:** Vercel SPA (`/` y `/admin`)  
**Backend / BaaS:** Supabase Cloud (`https://jlchjamoejkzahaeimec.supabase.co`)

---

## 1. RESUMEN EJECUTIVO & ESTADO GENERAL

El repositorio `nestor-pizzas-pwa` contiene la solución digital integral para la pizzería artesana **Néstor Pizzas** (ubicada en Caniles y Baza, Granada).

El proyecto fue concebido y estructurado bajo los estándares de **Architect.Sys**, fusionando una **Progressive Web App (PWA) de consumo de alta conversión** con un **Kitchen POS & Backoffice de Gestión en Tiempo Real** para cocina y mostrador.

### Métricas Clave del Repositorio:
* **Framework:** React 19 + TypeScript + Vite 8.
* **Estilizado & Diseño:** Tailwind CSS v4 + Plus Jakarta Sans & Outfit (Google Fonts).
* **Gestión de Estado:** Zustand 5 con persistencia (`cartStore`, `authStore`, `kioskCartStore`, `guestOrderStore`, `i18nStore`).
* **Base de Datos & Realtime:** Supabase (PostgreSQL, Row Level Security, RPC `process_checkout`, Realtime Channels).
* **Capacidades Offline/PWA:** Service Worker (`sw.js`) con estrategia Network-First y Web App Manifest con badges dinámicos.
* **Integraciones:** SumUp Payment Gateway (Simulación/Producción), EmailJS (`emailService.ts`), Web Audio API para alarma de comandas en cocina.
* **Catálogo Oficial:** 49 productos exactos extraídos del menú físico (18 pizzas tradicionales, 3 blancas, 4 patatas, 3 acompañamientos, 1 base por ingredientes, 1 Mazzi Pizza, 7 especialidades "Algo Más", 3 "Secret Burguer", 7 bebidas y 1 promoción especial "Jueves Locos").

---

## 2. ARQUITECTURA DEL SISTEMA Y ÁRBOL DE COMPONENTES

El proyecto se estructura con separación estricta de responsabilidades entre el flujo de cliente y el panel de administración:

```text
nestor-pizzas-pwa/
├── src/
│   ├── App.tsx                       # Orquestador maestro de vistas y modales globales
│   ├── main.tsx                      # Punto de entrada React 19 con Root mounting
│   ├── components/                   # Componentes atómicos y modales compartidos
│   │   ├── AddToCartModal.tsx        # Micro-modal de cantidad y notas para cocina
│   │   ├── CartBar.tsx               # Barra de comanda flotante inferior (Sticky Native)
│   │   ├── CartDrawer.tsx            # Cajón lateral del carrito
│   │   ├── CheckoutModal.tsx         # Pasarela oficial de pedidos (GPS Geocerca, VIP, Pagos)
│   │   ├── GuestRegistrationModal.tsx# Modal post-pedido para captar registro de invitados
│   │   ├── Header.tsx                # Cabecera responsive con switch ES/EN y accesos VIP
│   │   ├── Hero.tsx                  # Banner gastronómico interactivo
│   │   ├── IngredientsModal.tsx      # Personalizador de Pizza por Ingredientes (Base 6€ + 1€/ing)
│   │   ├── KioskIngredientsModal.tsx # Personalizador adaptado para TPV de mostrador
│   │   ├── KioskPromoJuevesModal.tsx # Modal de 2x11€ para TPV
│   │   ├── KioskSauceModal.tsx       # Modal de salsas para TPV
│   │   ├── NotificationManager.tsx   # Gestor de toasts y alertas del sistema
│   │   ├── ProductCard.tsx           # Tarjeta de producto con resaltador de ingredientes seguro
│   │   ├── PromoJuevesModal.tsx      # Modal cliente para la promoción Jueves Locos
│   │   ├── ReviewModal.tsx           # Modal de valoración post-entrega (5 estrellas)
│   │   ├── SauceModal.tsx            # Selector de salsa para Patatas Gajos
│   │   ├── SumUpPaymentModal.tsx     # Gateway de pago con tarjeta (SumUp)
│   │   ├── TicketPrinter.tsx         # Renderizador e impresor de comandas térmicas (80mm)
│   │   ├── UpsellModal.tsx           # "¿Completas tu comanda?" Recomendador estratégico
│   │   └── UserModal.tsx             # Centro de usuarios, saldo VIP, RGPD y eliminación
│   ├── data/
│   │   └── products.ts               # Catálogo tipado oficial (NESTOR_PRODUCTS, INGREDIENTES, UPSELLS)
│   ├── features/
│   │   ├── admin/                    # Módulo de Administración y Cocina
│   │   │   ├── AdminOrders.tsx       # Live Kitchen Monitor con alarma acústica
│   │   │   ├── AdminHistory.tsx      # Histórico de pedidos y exportación
│   │   │   ├── AdminKiosk.tsx        # TPV de mostrador para comandas presenciales
│   │   │   ├── AdminCatalog.tsx      # Gestor de catálogo y Kill-Switch en tiempo real
│   │   │   ├── AdminAnalytics.tsx    # Métricas de facturación y productos top
│   │   │   └── components/           # Formularios de productos, categorías y marketing
│   │   └── catalog/
│   │       └── Catalog.tsx           # Grid interactivo, selector de categorías y Marquee
│   ├── hooks/
│   │   └── usePWAInstall.ts          # Capturador de evento 'beforeinstallprompt'
│   ├── lib/
│   │   ├── supabase.ts               # Cliente singleton Supabase
│   │   └── emailService.ts           # Integración EmailJS para notificaciones
│   ├── pages/
│   │   ├── AdminDashboard.tsx        # Dashboard contenedor de administración (/admin)
│   │   └── OrderTracking.tsx         # Seguimiento en vivo de estado de pedido
│   ├── store/                        # Estado global Zustand persistido
│   │   ├── authStore.ts              # Sesión, perfil VIP, pedidos del usuario
│   │   ├── cartStore.ts              # Carrito cliente con auto-limpieza (15 min inactividad)
│   │   ├── guestOrderStore.ts        # Persistencia de orden para usuarios anónimos
│   │   ├── i18nStore.ts              # Internacionalización dinámico ES/EN
│   │   └── kioskCartStore.ts         # Carrito independiente para TPV de mostrador
│   └── utils/
│       ├── addressUtils.ts           # Formateo y parseo seguro de direcciones
│       ├── timeUtils.ts              # Horarios de apertura y cálculo de slots de 15 min
│       └── useHardwareBack.ts        # Manejo de botón 'Atrás' en móviles Android
├── public/                           # Assets estáticos y manifiestos
├── sw.js                             # Service Worker PWA con estrategia Network-First
├── index.html                        # Plantilla HTML con tipografía y configuraciones
├── manifest.json                     # PWA Web App Manifest
├── vercel.json                       # Configuración de despliegue SPA (Rewrites a index.html)
└── package.json                      # Dependencias y scripts de construcción
```

---

## 3. ANÁLISIS DETALLADO POR MÓDULOS Y COMPONENTES

### 3.1. Flujo de Navegación y Vistas de Cliente (`App.tsx` & `Catalog.tsx`)
1. **Preloader / Splash:** Al iniciar la app, se muestra un preloader durante 1.5s con animación de anillos concéntricos en verde esmeralda y el logotipo oficial en fondo negro con `mix-blend-screen`. Al terminar, realiza un desvanecimiento suave de 700ms antes de mostrar el catálogo.
2. **Rutas Limpias:** Si la URL es `/admin`, se omite el preloader y se carga de forma diferida (`lazy`) el `AdminDashboard`.
3. **Cabecera (`Header.tsx`):**
   - Logotipo oficial 2K con borde verde esmeralda.
   - Teléfono de contacto directo (`+34 679 76 19 87`) y dirección física.
   - Switch de idioma instantáneo (bandera UK / España) gestionado por `i18nStore`.
   - Botón de instalación PWA con animación de rebote.
   - Acceso al modal "Mi Cuenta" / "Perfil VIP".
   - Acceso directo al Tracker de pedidos activos.
4. **Filtros de Categoría Flotantes:**
   - Barra horizontal `sticky` con efecto glassmorphism.
   - Conteo en tiempo real de artículos disponibles por categoría.
   - Ticker animado (*Marquee*) con ofertas dinámicas y cuenta regresiva.
5. **Tarjeta de Ingredientes Oficiales:**
   - Renderizada al inicio de la sección de pizzas, exponiendo los 28 ingredientes oficiales del flyer para generar apetito y transparencia.

### 3.2. Tarjeta de Producto (`ProductCard.tsx`) & Lógica de Modales
* **Sanitización HTML Segura:** Las descripciones de productos pasan por `DOMPurify` para resaltar automáticamente ingredientes clave (mozzarella, kebab, salsa cheddar, etc.) con etiquetas `<span class="text-green-400 font-bold">` sin riesgo de inyecciones XSS.
* **Ruteo de Modales:**
  - Si el producto es `ID 22` (Margarita Base) o `ID 23` (Mazzi Pizza Base): abre `IngredientsModal.tsx`.
  - Si el producto es `ID 33` (Patatas Gajos): abre `SauceModal.tsx` para elegir salsa (Alioli, Barbacoa, Brava, Morisca).
  - Si el producto es `ID 999` (Jueves Locos): abre `PromoJuevesModal.tsx`.
  - Para el resto de productos: abre `AddToCartModal.tsx` con selector de unidades y observaciones para cocina.

### 3.3. Carrito y Checkout de Alta Conversión
1. **Barra de Comanda Flotante (`CartBar.tsx`):** Visible permanentemente cuando hay artículos en el carrito, con badge del número de ítems e importe acumulado.
2. **Embudo Intermedio de Upsell (`UpsellModal.tsx`):** Al presionar "Procesar Pedido", se despliega el modal "¿Completas tu comanda?" con recomendaciones de patatas, alitas, bebidas y postres traídos desde la tabla `upsells` de Supabase.
3. **Pasarela de Checkout (`CheckoutModal.tsx`):**
   - **Geocerca de Entrega:** Valida que el cliente esté en un radio máximo de 10 km respecto al centro de Caniles. Incluye bypass automático si el Código Postal es `18810`.
   - **Gestión de Pedido Mínimo:** Para reparto a domicilio, el pedido mínimo es de 12.00€. Si el pedido es inferior, ofrece continuar aceptando un recargo de 1.50€.
   - **Fidelización VIP:** Si el usuario tiene 25 puntos o más, puede canjearlos por el descuento del artículo de mayor valor (pizza o hamburguesa). Además, acumula +4 puntos por cada 10€ de compra.
   - **Selección Horaria:** "Lo antes posible" (si el local está abierto) o selector de franjas horarias en tramos de 15 minutos según los horarios oficiales de `timeUtils.ts`.
   - **Seguridad en Backend:** La inserción de la orden no confía en los precios enviados por el frontend, sino que invoca el procedimiento almacenado `process_checkout` en Supabase.
   - **Pasarela de Pago:** Integración de pago con tarjeta con SumUp (`SumUpPaymentModal.tsx`) para reparto a domicilio y opción de pago presencial para recogida en tienda.
   - **Notificaciones Automáticas:** Envío de correo de confirmación al cliente y al administrador mediante EmailJS.

### 3.4. Seguimiento de Pedidos en Vivo (`OrderTracking.tsx`)
* Suscripción en tiempo real vía `supabase.channel` a la tabla `orders`.
* Indicador visual de 3 fases: "Pedido Recibido" -> "En el Horno" -> "En Reparto / Listo para Recoger".
* Botón de valoración con estrellas (`ReviewModal.tsx`) cuando el pedido pasa a estado `delivered`.

### 3.5. Sistema de Usuarios y RGPD (`UserModal.tsx`)
* Modal modular con 10 sub-vistas: Login, Registro con confirmación, Perfil VIP con visualización de puntos, Edición de datos, Histórico de compras, Centro Legal (Privacidad, Términos, Cookies) y Flujo de Eliminación Definitiva de Cuenta conforme a la normativa europea RGPD.

### 3.6. Kitchen POS & Backoffice de Cocina (`AdminDashboard.tsx`)
1. **Monitor de Comandas en Vivo (`AdminOrders.tsx`):**
   - Alarma sonora en bucle al entrar un nuevo pedido pendiente.
   - Control de armado de audio para navegadores modernos (`localStorage` y desbloqueo por interacción).
   - Acciones directas sobre la comanda: "+15 min", "+30 min", avanzar estado, cancelar.
   - Impresión térmica directa formateada para tickets de 80mm (`TicketPrinter.tsx`).
2. **Kiosco de Mostrador (`AdminKiosk.tsx`):**
   - Diseñado para pantallas táctiles de mostrador.
   - Buscador rápido de clientes por teléfono o nombre.
   - Alta rápida de clientes y comanda directa sin pasar por pasarela web.
3. **Catálogo & Kill-Switch en Tiempo Real (`AdminCatalog.tsx`):**
   - Toggles instantáneos para marcar productos agotados en cocina (se ocultan inmediatamente en las apps de los clientes vía Supabase Realtime).
   - Creación, edición y borrado de productos y categorías con subida directa de imágenes al bucket `products` de Supabase Storage.
4. **Controles de Emergencia Globales:**
   - **Cierre de Emergencia (`store_closed`):** Bloquea compras en la PWA y muestra un aviso modal de local cerrado.
   - **Modo Saturación (`saturation_mode`):** Inserta un cintillo rojo en el menú avisando de tiempos de espera prolongados (+1 hora).

---

## 4. BASE DE DATOS Y ESTRUCTURA DE SUPABASE

### Tablas Principales:
* `categories`: Identificador de texto (ej: `NUESTRAS PIZZAS`), nombre, subtítulo, descripción y orden de visualización.
* `products`: Catálogo completo con campos `category_id`, `name`, `description`, `price`, `badge`, `img_url`, `is_active`.
* `ingredients`: Lista de ingredientes oficiales para extras (+1.00€).
* `upsells`: Relación de productos recomendados para la pasarela intermedia previa al checkout.
* `profiles`: Perfiles de usuario vinculados a `auth.users`, con campos `points`, `phone`, `address` (JSON), `is_admin`.
* `orders` & `order_items`: Registro histórico y en tiempo real de pedidos con detalle de personalización en formato JSONB.
* `app_settings`: Claves de configuración global del restaurante (`store_closed`, `saturation_mode`).

### Funciones & Políticas de Seguridad (RLS):
* **RPC `process_checkout`:** Valida que el usuario tenga saldo de puntos suficiente, calcula precios directamente desde la tabla `products` para prevenir manipulaciones en el cliente, inserta la orden y los ítems en una única transacción atómica y actualiza los puntos VIP.
* **Políticas RLS:** Los usuarios solo pueden consultar sus propios pedidos y perfiles. Los usuarios con `is_admin = true` tienen permisos totales de lectura y escritura en todas las tablas operativas.

---

## 5. AUDITORÍA DE PWA, SERVICE WORKER Y RENDIMIENTO

* **Service Worker (`sw.js`):** Implementa estrategia **Network-First** con bypass de caché (`cache: 'no-store'`) para garantizar que los clientes siempre vean el menú y los precios más recientes cuando tienen conexión, utilizando la caché local exclusivamente como salvaguarda offline.
* **Manifest (`manifest.json`):** Configurado con modo `standalone`, color de tema `#16A34A` e iconos optimizados de 192x192 y 512x512.
* **Construcción Vite:** Tiempo de compilación en producción de ~500ms con chunks optimizados y carga diferida (`lazy`) de las vistas pesadas (`Catalog`, `AdminDashboard`, `OrderTracking`).

---

## 6. ESTADO DEL CHECKLIST Y MATRIZ DE PENDIENTES / AJUSTES

Basado en la contrastación entre el código fuente actual y las especificaciones del documento `CHECKLIST.md`:

| Módulo / Requisito | Estado en Código | Detalle Técnico |
| :--- | :---: | :--- |
| **Módulo 1: UI/UX Global & Cabecera** | ✅ **COMPLETADO** | Header 100% responsive, selector ES/EN, Marquee dinámico, conteo de productos. |
| **Módulo 2: Usuarios & Fidelización** | ✅ **COMPLETADO** | Auth Supabase, modal VIP con saldo en grande, canje de 25 pts, baja RGPD. |
| **Módulo 3: Reglas de Catálogo (Flyer)** | ✅ **COMPLETADO** | 49 productos oficiales, Marquee bajo categorías, resaltador seguro de ingredientes. |
| **Módulo 4: Modificaciones Específicas** | ⚠️ **PARCIAL / PENDIENTE** | Se requiere revisar notas puntuales de exclusión de ingredientes en pizzas tradicionales y textos de pizzas blancas. |
| **Módulo 5: Secret Burguer & Algo Más** | ✅ **COMPLETADO** | 3 Secret Burguers (10.40€) y nuevas especialidades (Crujiente 7.40€, Extremeño 8.40€, Serranito 8.40€) integradas. |
| **Módulo 6: Carrito, Upsell y Pagos** | ✅ **COMPLETADO** | CartBar sticky, Upsell intermedio con 3 botones tácticos, pasarela SumUp por defecto. |
| **Módulo 7: Backoffice Cocina (POS)** | ✅ **COMPLETADO** | Alarma acústica en bucle, impresor de tickets 80mm, TPV Kiosco mostrador, Kill-Switch y Modos de Emergencia. |

---

## 7. INSTRUCCIONES PARA EL ENTORNO DE DESARROLLO LOCAL

1. El servidor de desarrollo Vite se encuentra **activo y escuchando** en:
   - **Local:** `http://localhost:5174/`
   - **Red:** `http://167.233.37.149:5174/`
2. Para probar la vista de administración:
   - Navegar a `http://localhost:5174/admin` o iniciar sesión con una cuenta que tenga `is_admin = true` en la tabla `profiles`.
3. Para ejecutar la suite de construcción o pruebas:
   ```bash
   npm run build
   ```

---
*Reporte generado y certificado para Architect.Sys — Proyecto Néstor Pizzas PWA.*
