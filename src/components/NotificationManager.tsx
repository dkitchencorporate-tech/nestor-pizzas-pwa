import { useEffect } from 'react';
import { useI18nStore } from '../store/i18nStore';

export default function NotificationManager() {
  const { t } = useI18nStore();
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerNativeNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/brand/icon-192.png',
        badge: '/assets/brand/icon-192.png',
        vibrate: [200, 100, 200]
      });
    }
  };

  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      // Sonido de alerta más agresivo (Doble pitido agudo)
      osc1.type = 'square';
      osc2.type = 'sawtooth';
      
      const now = ctx.currentTime;
      
      // Primer pitido
      osc1.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.setValueAtTime(885, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      // Segundo pitido
      osc1.frequency.setValueAtTime(880, now + 0.2);
      osc2.frequency.setValueAtTime(885, now + 0.2);
      gain.gain.setValueAtTime(0.1, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.error('AudioContext error', e);
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pending': 
        return { label: t('status_pending_title'), desc: t('status_pending_desc') };
      case 'cooking': 
        return { label: t('status_cooking_title'), desc: t('status_cooking_desc') };
      case 'delivering': 
        return { label: t('status_delivering_title'), desc: t('status_delivering_desc') };
      case 'ready':
        return { label: t('status_ready_title'), desc: t('status_ready_desc') };
      case 'cancelled':
        return { label: t('status_cancelled_title'), desc: t('status_cancelled_desc') };
      default: 
        return { label: t('status_completed_title'), desc: t('status_completed_desc') };
    }
  };

  useEffect(() => {
    const handleDelivered = (e: any) => {
      playAlertSound();
      triggerNativeNotification(t('order_delivered_title'), t('order_delivered_desc'));
    };

    const handleStatusChanged = (e: any) => {
      playAlertSound();
      const statusInfo = getStatusInfo(e.detail.status);
      triggerNativeNotification(t('order_update_title'), statusInfo.label + ': ' + statusInfo.desc);
    };

    window.addEventListener('order-delivered', handleDelivered);
    window.addEventListener('order-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('order-delivered', handleDelivered);
      window.removeEventListener('order-status-changed', handleStatusChanged);
    };
  }, []);

  return null; // Este componente es invisible
}
