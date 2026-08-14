import { useEffect } from 'react';

export default function NotificationManager() {
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
        return { label: 'PEDIDO RECIBIDO', desc: 'Estamos confirmando tu pedido.' };
      case 'cooking': 
        return { label: 'COCINANDO', desc: 'Tu comida está en el horno.' };
      case 'delivering': 
        return { label: 'EN REPARTO', desc: 'El repartidor va en camino.' };
      case 'ready':
        return { label: 'LISTO PARA RECOGER', desc: 'Tu pedido está listo en el local.' };
      case 'cancelled':
        return { label: 'PEDIDO RECHAZADO', desc: 'Lamentablemente tu pedido ha sido cancelado o rechazado.' };
      default: 
        return { label: 'COMPLETADO', desc: 'Pedido entregado.' };
    }
  };

  useEffect(() => {
    const handleDelivered = (e: any) => {
      playAlertSound();
      triggerNativeNotification('¡Pedido Entregado!', 'Esperamos que lo disfrutes muchísimo. Gracias por confiar en Néstor Pizzas.');
    };

    const handleStatusChanged = (e: any) => {
      playAlertSound();
      const statusInfo = getStatusInfo(e.detail.status);
      triggerNativeNotification('Actualización de Pedido', statusInfo.label + ': ' + statusInfo.desc);
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
