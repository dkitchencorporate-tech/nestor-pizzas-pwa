import { useState, useEffect } from 'react';

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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptToInstall = async () => {
    if (!installPrompt) {
      alert('La aplicación ya está instalada en este dispositivo o el navegador no soporta la instalación directa.\n\nNota: La App de Pedidos y el Panel de Administración (Kitchen POS) son la MISMA aplicación (PWA). Si ya instalaste "Néstor Pizzas", puedes usar ese mismo icono para entrar como administrador.\n\nEn iPhone/iPad: Abre Safari, pulsa "Compartir" y selecciona "Añadir a la pantalla de inicio".');
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
