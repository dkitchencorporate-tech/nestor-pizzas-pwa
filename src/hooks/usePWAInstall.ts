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
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isAdmin = window.location.pathname.startsWith('/admin');
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

      if (isStandalone) {
        alert('¡Ya estás usando la App instalada!');
        return;
      }

      if (isIOS) {
         alert('Para instalar en iPhone/iPad:\n1. Pulsa el botón "Compartir" de Safari (cuadrado con flecha).\n2. Selecciona "Añadir a la pantalla de inicio".');
         return;
      }

      // Auto-Cache Busting: Si es Android/PC y falla, intentamos purgar la caché automáticamente
      if (!sessionStorage.getItem('pwa_cache_cleared') && !isAdmin) {
        sessionStorage.setItem('pwa_cache_cleared', 'true');
        
        try {
          // Purgar Service Workers fantasmas
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) await r.unregister();
          }
          // Purgar caché del navegador que bloquea el manifest
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (e) {
          console.error('Error purgando caché:', e);
        }
        
        alert('Optimizando conexión para habilitar la descarga segura...\n\nLa página se recargará automáticamente.');
        window.location.reload();
        return;
      }

      if (isAdmin) {
        alert('La aplicación de Administración ya está instalada o tu navegador bloqueó el aviso.\n\nNota: Si ya habías instalado Néstor Pizzas antes, prueba a borrarla de tu pantalla de inicio y limpiar la caché.');
      } else {
        alert('El sistema de tu teléfono indica que la aplicación ya está instalada.\n\nSi no la ves en tu pantalla de inicio, el sistema Android la ha bloqueado internamente. Para solucionarlo:\n\n1. Ve a los Ajustes de tu teléfono.\n2. Busca la App "Néstor Pizzas" y dale a Desinstalar.\n3. Vuelve a intentarlo.');
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
