# CHECKLIST DE AUDITORÍA Y CONTROL MILIMÉTRICO (V 3.0 - ENTERPRISE)
**Rol:** @agency-engineering-code-reviewer

## MÓDULO 1: UI/UX GLOBAL Y NAVEGACIÓN BASE (CABECERA Y ARRANQUE)
- [x] **Fase 4: Dashboard de Administración (Core)**
  - [x] Implementar AdminDashboard con pestañas (Cocina, Kiosko, Catálogo, Analítica).
  - [x] Realtime Supabase para Cocina.
  - [x] Kill-Switch en el catálogo.
  - [x] Proteger ruta `/admin` con políticas de RLS o estado de Zustand.
  - [x] Conectar Checkout con la inserción de órdenes a Supabase.
- [x] 2. **Cabecera Principal (Top Bar):** Restaurar los botones exactos de acción rápida: "INSTALAR APP", "Llamar", "WhatsApp" e "INICIAR SESIÓN".
- [x] 3. **Cinta Flotante de Ofertas (Marquee):** Recrear la barra inferior de la cabecera con el temporizador ("LA OFERTA TERMINA EN...") y el texto deslizante de fidelización.
- [x] 4. **Filtros de Categoría:** El menú horizontal debe reflejar el conteo real de productos entre paréntesis (ej: "MENÚ COMPLETO (49)").

## MÓDULO 2: SISTEMA DE USUARIOS, FIDELIZACIÓN (VIP) Y LEGAL
- [x] 5. **Modal "MI CUENTA" (Login/Registro):** Restaurar modal de autenticación exacto. Conectar a Supabase Auth.
- [x] 6. **Modal "PERFIL VIP":** Panel que salude, lea puntos desde Supabase (`profiles.points`) en grande/amarillo, y muestre "MIS DATOS".
- [x] 7. **Modal "RECOMPENSAS":** UI de canje (ej: 100 pts = -4€) con botones visuales preparados contra el estado del carrito.
- [x] 8. **Centro Legal:** Botones/rutas RGPD (Privacidad, Términos, Datos) con confirmación "ENTENDIDO Y ACEPTAR".
- [x] 9. **Flujo de Baja:** Select de motivo, checkbox irreversible, y botón rojo oscuro "CONFIRMAR ELIMINACIÓN DEFINITIVA".

## MÓDULO 3: REGLAS DE CATÁLOGO (EL CORE DEL KIOSCO)
### AUDITORÍA DE ERRORES REPORTADOS:
- [x] **Duplicación de Patatas:** Corregido. Se eliminó la inyección duplicada de datos en `products.ts` que causaba la doble renderización.
- [x] **Header Responsivo:** Corregido. El menú superior ahora llega de lado a lado.
- [x] **Categoría POR INGREDIENTES:** Renderizado estricto del producto 1:1, usando la pasarela `IngredientsModal.tsx` con el precio de 5.50€.
- [x] **Mazzi Pizza:** Se creó el producto "MAZZI PIZZA BASE" con precio de 9.50€ y apertura de modal adaptado para tamaño MAXI.
- [x] **Flotación Armónica del Menú de Categorías (Marquee):** Se auditó la versión de GitHub y se trasladó el Marquee desde el `Header` al contenedor dinámico de `Catalog.tsx`, quedando exactamente debajo de "MENÚ COMPLETO" para que bajen flotando de forma conjunta y armónica.
- [x] **Modal de Checkout 1:1:** Se eliminó el checkout de diseño nuevo y se reconstruyó `CheckoutModal.tsx` clonando milimétricamente el HTML original de la demo ("Pasarela Oficial de Pedidos Caniles y Baza"), incluyendo los paneles VIP, métodos de envío y forma de pago (Bizum, TPV, Efectivo).tegorías con Títulos y Descripciones originales.
- [x] 11. **Zona de Ingredientes Superior:** Renderizar panel destacado de "NUESTROS INGREDIENTES" al inicio.
- [x] 12. **Flujo A (Por Ingredientes):** 1 sola base ("Pizza Margarita"). Selector abierto. Cada extra suma +1,00€. Modal con foto real de pizza base. Permitir múltiples pizzas personalizadas en carrito (Zustand Array).
- [x] 13. **Flujo B (Mazzi y Nuestras Pizzas):** Eliminar opciones Mazzi +1, +2, +3. "Mazzi Pizza" es producto único (9,50€). Añadir al carrito en 1-clic. Micro-Modal post-clic para cantidad (+/-) y "Notas".
- [x] 14. **Resaltador de Ingredientes:** Destacar visualmente (color/bold) los ingredientes en la descripción de cada pizza.

## MÓDULO 4: MODIFICACIONES ESPECÍFICAS DE PRODUCTOS (NOTAS MANUSCRITAS DEL CLIENTE)
- [ ] 16. **Pizza por Ingredientes:** Dejar el configurador y explotarlo solo (1€). Dejar solo 1 base (Margarita) con el selector abierto a valor de 1€. Cambiar descripción base Margarita a "Nota".
- [ ] 17. **Las 18 Variedades (Baza) y Pizzas Blancas:** Quitar el configurador de mitades. Dejar solo botón funcional para agregar directamente sin opciones. Dejar un campo "Nota" puntual para que escriban lo que NO quieren.
- [ ] 18. **Pizzas Blancas:** Quitar texto "sin gluten".
- [ ] 19. **Pizza 4 Quesos:** Modificar foto (sin queso azul).
- [ ] 20. **Botón de 1/2:** Dejar sin configurador.
- [ ] 21. **Patatas Gajo:** Solo agregar selector de salsa con su coste y dos notas.
- [ ] 22. **Patatas Gratinadas:** Agregar que "llevan bacon y salsa cheddar" en la descripción.
- [ ] 23. **Sección Algo Más:** Quitar todo lo de "Desayunos" o "Reserva".
- [ ] 24. **Global:** Corregir el Nombre de Pizzas y el Resaltado de Ingredientes.

## MÓDULO 5: NUEVOS PRODUCTOS Y LÓGICA TEMPORAL (Forzado a VISIBLE para Dev)
- [ ] 25. **Secret Burguer:** (9,90€ cada una)
  - Cheddar Love (Carne, cheddar, bacon, salsa cheddar).
  - Cabrona (Carne, queso cabra, cebolla caramelizada, salsa miel-mostaza).
  - Pulled BBQ (Carne, cheddar, pulled pork, salsa barbacoa).
  - *Imágenes fotorrealistas generadas e integradas.*
- [ ] 26. **Algo Más Nuevos:**
  - Burguer crujiente 6,90€ (Pollo crujiente, lechuga, cheddar loncha y bacon).
  - Bocata extremeño 7,90€ (Escalope pollo, bacon, cheddar loncha, salsa morisca).
  - Bocata serranito 7,90€ (Escalope lomo, pimiento verde, jamón serrano, salsa alioli).

## MÓDULO 6: CARRITO, UPSELL Y PAGOS
- [ ] 27. **Barra de Comanda Flotante:** Recrear barra pegajosa inferior que abre el Upsell al hacer clic.
- [ ] 28. **Flujo de Upsell Intermedio:** Replicar exactamente el modal "¿COMPLETAS TU COMANDA?" con complementos predefinidos y 3 botones originales tras pulsar pagar.
- [ ] 29. **Checkout Restringido:** Eliminar TODO tipo de sistema de pago excepto "Pago por tarjeta".
- [ ] 30. **Única Pasarela:** Panel de Tarjeta TPV exclusivo y por defecto en Checkout.

## MÓDULO 7: DASHBOARD DE GESTIÓN (BACKOFFICE COCINA)
- [ ] 31. **UI/UX Consistente y Realtime:** Diseño alineado a la PWA. Comandas sincronizadas sin recargar vía Supabase Realtime.
- [ ] 32. **Control de Tiempos y Kill-Switch:** Botones operativos en la orden (+15 min / +30 min). Toggles en catálogo admin para marcar productos "Agotados" en tiempo real.
