# 🍕 Néstor Pizzas PWA | Pedidos Oficiales & Carta Digital

> **Desarrollado por Architect.Sys** • Dirección Técnica & Arquitectura de Software  
> **Cliente:** Néstor Pizzas (Caniles & Baza, Granada)

---

## 📌 Descripción del Proyecto

Aplicación Web Progresiva (**PWA**) de alta gama desarrollada exclusivamente para **Néstor Pizzas**. Diseñada para ofrecer una experiencia nativa móvil fluida sin necesidad de instalación desde App Store o Google Play Store, permitiendo a los clientes de Caniles y Baza realizar pedidos online (para llevar o a domicilio), personalizar sus pizzas y bebidas, acceder a promociones exclusivas y formalizar la orden vía WhatsApp o pasarelas de pago seguras.

---

## 🚀 Características Principales

* 📱 **PWA Nativa & Offline-First:** Instalable en iOS/Android con compatibilidad offline mediante Service Worker (`sw.js`).
* 🎨 **Diseño UI/UX Gourmet:** Paleta cromática exclusiva, tipografía fluida (*Outfit* & *Plus Jakarta Sans*) y diseño responsivo adaptado a todos los dispositivos.
* 🍕 **Motor de Pedidos & Carrito Interactivo:** Selección rápida de artículos, cálculo dinámico de precios, modificaciones de ingredientes y observaciones para cocina.
* 💡 **Upsells & Venta Cruzada Dinámica:** Recomendador estratégico de complementos (patatas, bebidas, postres) previo al checkout.
* 💳 **Integración Multi-Pasarela:** Preparado para procesamiento vía SumUp, Stripe, Redsys/Bizum y comanda estructurada por WhatsApp Business.
* 📄 **Carta Imprimible Plastificable A4:** Menú impreso sincronizado de 48 artículos a 2 columnas con código QR nativo.

---

## 📁 Estructura del Repositorio

```text
nestor-pizzas-pwa/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Pipeline de despliegue automático a GitHub Pages
├── assets/
│   ├── brand/                      # Logotipo e iconos vectoriales de la marca
│   ├── generated_graphics/         # Banners de campaña y material promocional HD
│   └── products/                   # Fotografía gastronómica optimizada
├── docs/
│   ├── comercial/                  # Dossier de propuesta comercial y contratos
│   ├── estrategia/                 # Plan de marketing y captación por WhatsApp
│   ├── guias/                      # Guía maestra de prompts IA para fotografía gourmet
│   └── print/                      # Carta física imprimible A4 plastificable
├── index.html                      # Aplicación PWA principal
├── manifest.json                   # Web App Manifest (PWA)
├── package.json                    # Scripts y manifiesto del proyecto
├── README.md                       # Documentación ejecutiva
├── server.js                       # Servidor local Node.js nativo (HTTP/SPA)
├── sw.js                           # Service Worker PWA con estrategia Network-First
└── test_urls.js                    # Test suite para verificación automatizada de URLs
```

---

## 🛠️ Instalación & Servidor de Desarrollo Local

### Requisitos Previos
* Node.js v18+ o superior.

### Iniciar el servidor local:
```bash
# Clonar repositorio
git clone https://github.com/dkitchencorporate-tech/nestor-pizzas-pwa.git
cd nestor-pizzas-pwa

# Iniciar servidor local
npm start
```
El servidor escuchará en `http://localhost:8080/` con recarga y fallback PWA activados.

---

## 🧪 Pruebas y Verificación Automatizada

Para verificar la integridad de todos los recursos gráficos y URLs externas del proyecto:
```bash
npm test
```

---

## 📄 Licencia & Derechos

© 2026 **Architect.Sys** & **Néstor Pizzas**. Todos los derechos reservados.  
Queda prohibida la reproducción o redistribución no autorizada del código fuente sin consentimiento explícito.
