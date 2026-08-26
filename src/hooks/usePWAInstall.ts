import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = async () => {
      console.log('PWA was installed!');
      const isAdmin = window.location.pathname.startsWith('/admin');
      
      // Intentar guardar en Supabase (fallará en silencio si la tabla no existe aún)
      try {
        await supabase.from('pwa_analytics').insert([
          { 
            device_type: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            app_type: isAdmin ? 'admin' : 'public',
            user_agent: navigator.userAgent
          }
        ]);
      } catch (err) {
        console.error('Error tracking PWA install:', err);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptToInstall = async () => {
    if (!installPrompt) {
      const isAdmin = window.location.pathname.startsWith('/admin');
      if (isAdmin) {
        alert('La aplicación de Administración ya está instalada o tu navegador bloqueó el aviso.\n\nNota: Si ya habías instalado Néstor Pizzas antes, prueba a borrarla de tu pantalla de inicio, limpiar la caché de Chrome, y volver a pulsar este botón.\n\nEn iPhone/iPad: Abre Safari, pulsa "Compartir" y "Añadir a la pantalla de inicio".');
      } else {
        alert('Parece que la aplicación ya está instalada en tu dispositivo o tu navegador requiere que limpies la caché para mostrar el aviso de descarga de nuevo.\n\nSi no ves la App en tu móvil:\n1. Ve a los Ajustes de Chrome -> Borrar datos de navegación (Caché).\n2. Vuelve a entrar a nestorpizzas.es.\n\nEn iPhone/iPad: Pulsa el botón "Compartir" de Safari y luego "Añadir a la pantalla de inicio".');
      }
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPrompt(null);
  };

  return { installPrompt, promptToInstall };
}
