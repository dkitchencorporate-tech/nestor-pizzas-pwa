/**
 * Integración con EmailJS para el envío de correos electrónicos transaccionales.
 * 
 * INSTRUCCIONES PARA EL ADMINISTRADOR:
 * 1. Crea una cuenta gratuita en https://www.emailjs.com/
 * 2. Añade un servicio de correo (Ej. Gmail) en EmailJS.
 * 3. Crea 3 plantillas de correo y anota sus IDs.
 * 4. Reemplaza las variables "YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID_..." y "YOUR_PUBLIC_KEY" con tus datos reales.
 * 5. Descomenta el código de envío (emailjs.send) en cada función.
 */

// Para instalar EmailJS, ejecuta: npm install @emailjs/browser
import emailjs from '@emailjs/browser';

const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY"; // Reemplazar con tu Public Key
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID"; // Reemplazar con tu Service ID

// Template IDs
const TEMPLATE_ORDER_CONFIRMATION = "YOUR_TEMPLATE_ID_CLIENTE";
const TEMPLATE_ORDER_ADMIN = "YOUR_TEMPLATE_ID_ADMIN";
const TEMPLATE_WELCOME = "YOUR_TEMPLATE_ID_WELCOME";

export const emailService = {
  /**
   * Inicializa EmailJS (llamar esto al inicio de la app, ej. en App.tsx o index.tsx)
   */
  init: () => {
    try {
      if (EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(EMAILJS_PUBLIC_KEY);
      }
    } catch (error) {
      console.error("Error inicializando EmailJS", error);
    }
  },

  /**
   * Envía confirmación de pedido al cliente
   */
  sendOrderConfirmation: async (clientEmail: string, orderDetails: any) => {
    if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") return; // Bypass if not configured
    
    try {
      const templateParams = {
        to_email: clientEmail,
        order_id: orderDetails.id,
        total_amount: orderDetails.total.toFixed(2),
        // Añade más variables según tu plantilla de EmailJS
      };

      await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_ORDER_CONFIRMATION, templateParams);
      console.log('Correo de confirmación enviado al cliente.');
    } catch (error) {
      console.error('Error enviando correo de confirmación al cliente:', error);
    }
  },

  /**
   * Envía notificación de nuevo pedido al administrador
   */
  sendOrderToAdmin: async (orderDetails: any) => {
    if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") return;
    
    try {
      const templateParams = {
        order_id: orderDetails.id,
        total_amount: orderDetails.total.toFixed(2),
        customer_name: orderDetails.clientName || 'Cliente Anónimo',
        // Añade más variables según tu plantilla
      };

      await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_ORDER_ADMIN, templateParams);
      console.log('Correo de notificación enviado al admin.');
    } catch (error) {
      console.error('Error enviando correo al admin:', error);
    }
  },

  /**
   * Envía correo de bienvenida al nuevo usuario registrado
   */
  sendWelcomeEmail: async (clientEmail: string, clientName: string) => {
    if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") return;

    try {
      const templateParams = {
        to_email: clientEmail,
        user_name: clientName,
      };

      await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_WELCOME, templateParams);
      console.log('Correo de bienvenida enviado.');
    } catch (error) {
      console.error('Error enviando correo de bienvenida:', error);
    }
  },

  /**
   * Envía una campaña de marketing a todos los usuarios
   */
  sendMarketingCampaign: async (subject: string, message: string, userCount: number) => {
    // Aquí se integraría la API de Resend o EmailJS para envíos masivos.
    // Dado que requiere validación de backend/Edge Functions, lo simulamos para el frontend.
    console.log(`Campaña "${subject}" enviada a ${userCount} usuarios.`);
    
    // Simular un pequeño retardo de red
    return new Promise(resolve => setTimeout(resolve, 1500));
  }
};
