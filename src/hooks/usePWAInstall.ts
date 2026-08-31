import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAState {
  installPrompt: BeforeInstallPromptEvent | null;
  isInstallModalOpen: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setIsInstallModalOpen: (open: boolean) => void;
  setIsIOS: (isIos: boolean) => void;
  setIsStandalone: (isStandalone: boolean) => void;
  triggerDirectPrompt: () => Promise<void>;
  promptToInstall: () => Promise<void>;
}

export const usePWAInstall = create<PWAState>((set, get) => ({
  installPrompt: null,
  isInstallModalOpen: false,
  isIOS: typeof window !== 'undefined' ? (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) : false,
  isStandalone: typeof window !== 'undefined' ? (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) : false,
  
  setInstallPrompt: (prompt) => set({ installPrompt: prompt }),
  setIsInstallModalOpen: (isInstallModalOpen) => set({ isInstallModalOpen }),
  setIsIOS: (isIOS) => set({ isIOS }),
  setIsStandalone: (isStandalone) => set({ isStandalone }),

  triggerDirectPrompt: async () => {
    const prompt = get().installPrompt;
    if (!prompt) return;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        set({ installPrompt: null, isInstallModalOpen: false });
      }
    } catch (e) {
      console.error('Error triggering direct install prompt:', e);
    }
  },

  promptToInstall: async () => {
    const prompt = get().installPrompt;
    if (prompt) {
      await get().triggerDirectPrompt();
    } else {
      set({ isInstallModalOpen: true });
    }
  }
}));

// Initialize global event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePWAInstall.getState().setInstallPrompt(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', async () => {
    console.log('PWA was installed!');
    usePWAInstall.getState().setIsStandalone(true);
    usePWAInstall.getState().setInstallPrompt(null);
    usePWAInstall.getState().setIsInstallModalOpen(false);
    
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
  });
}
