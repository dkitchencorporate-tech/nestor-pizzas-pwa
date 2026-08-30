import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = async () => {
      console.log('PWA was installed!');
      const isAdmin = window.location.pathname.startsWith('/admin');
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

  const triggerDirectPrompt = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (e) {
      console.error('Error triggering direct install prompt:', e);
    }
  };

  const promptToInstall = async () => {
    if (installPrompt) {
      await triggerDirectPrompt();
    } else {
      setIsInstallModalOpen(true);
    }
  };

  return {
    installPrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    isIOS,
    isStandalone,
    triggerDirectPrompt,
    promptToInstall
  };
}
