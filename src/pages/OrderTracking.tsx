import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGuestOrderStore } from '../store/guestOrderStore';
import { useI18nStore } from '../store/i18nStore';
import { supabase } from '../lib/supabase';
import { getOrderVipRedemptionInfo } from '../store/loyaltyStore';

// Instancia global compartida de AudioContext + HTML5 Audio WAV para que iOS Safari / Android
// reproduzcan el timbre por el canal Multimedia ('playback'), sonando incluso si el iPhone
// tiene el modo Silencio (🔕) activado.
let sharedAudioCtx: AudioContext | null = null;
let sharedHtmlAudio: HTMLAudioElement | null = null;
let cachedWavUrl: string | null = null;

function buildWavChimeUrl(): string {
  if (cachedWavUrl) return cachedWavUrl;
  const sampleRate = 22050;
  const durationSec = 1.35;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Doble timbre de campana claro y potente (Do5 - Mi5 - Sol5 - Do6 x2)
  const notes = [
    { start: 0.0, dur: 0.14, freq: 587.33 },
    { start: 0.13, dur: 0.14, freq: 783.99 },
    { start: 0.26, dur: 0.16, freq: 987.77 },
    { start: 0.40, dur: 0.28, freq: 1174.66 },
    { start: 0.72, dur: 0.14, freq: 587.33 },
    { start: 0.85, dur: 0.14, freq: 783.99 },
    { start: 0.98, dur: 0.35, freq: 1174.66 }
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const n of notes) {
      if (t >= n.start && t <= n.start + n.dur) {
        const localT = t - n.start;
        const env = Math.exp(-localT * 6.5) * Math.min(1, localT / 0.008);
        sample += (Math.sin(2 * Math.PI * n.freq * localT) * 0.65 + Math.sin(4 * Math.PI * n.freq * localT) * 0.25) * env;
      }
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  cachedWavUrl = URL.createObjectURL(blob);
  return cachedWavUrl;
}

function forcePlaybackAudioSession() {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).audioSession) {
      (navigator as any).audioSession.type = 'playback';
    }
  } catch {
    // Ignorar en navegadores sin audioSession API
  }
}

function getOrUnlockAudioCtx(): AudioContext | null {
  try {
    forcePlaybackAudioSession();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export async function unlockAudio(playConfirmBeep = true): Promise<boolean> {
  forcePlaybackAudioSession();
  const ctx = getOrUnlockAudioCtx();
  try {
    if (!sharedHtmlAudio) {
      sharedHtmlAudio = new Audio(buildWavChimeUrl());
      sharedHtmlAudio.preload = 'auto';
      (sharedHtmlAudio as any).playsInline = true;
    }
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    if (playConfirmBeep) {
      await playStatusChime(false);
    } else if (sharedHtmlAudio) {
      sharedHtmlAudio.volume = 0.01;
      sharedHtmlAudio.currentTime = 0;
      sharedHtmlAudio.play().then(() => {
        if (sharedHtmlAudio) {
          sharedHtmlAudio.pause();
          sharedHtmlAudio.currentTime = 0;
          sharedHtmlAudio.volume = 1.0;
        }
      }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

// Sonido híbrido (Canal Multimedia HTML5 WAV + Web Audio API + Vibración)
export async function playStatusChime(doubleRing = true): Promise<void> {
  try {
    forcePlaybackAudioSession();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(doubleRing ? [250, 120, 250, 120, 400] : [150]);
    }

    // 1) Reproducir por canal Multimedia HTML5 <audio> (suena en iPhone aunque tenga el modo silencio 🔕)
    try {
      if (!sharedHtmlAudio) {
        sharedHtmlAudio = new Audio(buildWavChimeUrl());
      }
      sharedHtmlAudio.volume = 1.0;
      sharedHtmlAudio.currentTime = 0;
      void sharedHtmlAudio.play().catch(() => {});
    } catch {
      // Fallback a Web Audio
    }

    // 2) Refuerzo simultáneo por Web Audio API (despertando el contexto si estaba suspendido)
    const ctx = getOrUnlockAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }

    const playChordSequence = (offsetSec: number) => {
      const notes = [587.33, 783.99, 987.77, 1174.66];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + offsetSec + i * 0.11;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.85, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.40);
      });
    };

    playChordSequence(0);
    if (doubleRing) {
      playChordSequence(0.65);
    }
  } catch (e) {
    console.warn('Audio chime no soportado:', e);
  }
}

// Convierte la clave pública VAPID (base64url) al formato Uint8Array que pide pushManager.subscribe
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function OrderTracking({ onBack }: { onBack: () => void }) {
  const { t } = useI18nStore();
  const { orders, user, fetchOrders } = useAuthStore();
  const { guestOrders, guestOrder } = useGuestOrderStore();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported' | 'error'>('idle');
  const prevStatusRef = useRef<string | null>(null);

  const subscribeToPush = async (phone: string) => {
    unlockAudio();
    setPushStatus('subscribed');

    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        // Ignorar si el usuario descarta
      }
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      });
      await fetch('/api/save-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, subscription: subscription.toJSON() })
      });
    } catch (e) {
      console.warn('Suscripción push falló en background, aviso acústico activo:', e);
    }
  };

  const activeOrders = useMemo(() => {
    if (user) {
      return (orders || []).filter((o: any) => ['pending', 'cooking', 'delivering', 'ready'].includes(o?.status));
    } else {
      const list = guestOrders && guestOrders.length > 0 ? guestOrders : (guestOrder ? [guestOrder] : []);
      return list.filter((o: any) => ['pending', 'cooking', 'delivering', 'ready'].includes(o?.status));
    }
  }, [orders, guestOrders, guestOrder, user]);

  const activeOrder = activeOrders[selectedOrderIndex] || activeOrders[0] || null;

  // Desbloqueo silencioso en el primer toque de pantalla + suscripción Realtime directa + polling cada 4s
  useEffect(() => {
    const handleFirstGesture = () => {
      void unlockAudio(false);
    };
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    const poll = setInterval(() => {
      fetchOrders();
    }, 4000);
    const channel = supabase
      .channel(`tracking_orders_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  // Alarma acústica y notificación local para el cliente cuando el pedido cambia de estado
  useEffect(() => {
    if (!activeOrder?.status) return;
    if (prevStatusRef.current && prevStatusRef.current !== activeOrder.status) {
      void playStatusChime(true);
      if ('Notification' in window && Notification.permission === 'granted') {
        const statusMsg =
          activeOrder.status === 'cooking'
            ? '🔥 ¡Tu pedido acaba de entrar al horno!'
            : activeOrder.status === 'ready'
            ? '🎉 ¡Tu pedido ya está listo para recoger en mostrador!'
            : activeOrder.status === 'delivering'
            ? '🛵 ¡Tu pedido va de camino a tu domicilio!'
            : 'Actualización de tu pedido en Néstor Pizzas';
        try {
          new Notification('Néstor Pizzas Caniles', { body: statusMsg, icon: '/pwa-192x192.png' });
        } catch {
          navigator.serviceWorker?.ready.then(reg => {
            reg.showNotification('Néstor Pizzas Caniles', { body: statusMsg, icon: '/pwa-192x192.png' });
          }).catch(() => {});
        }
      }
    }
    prevStatusRef.current = activeOrder.status;
  }, [activeOrder?.status, activeOrder?.delivery_method]);

  const historyOrders = useMemo(() => {
    if (user) {
      return (orders || []).filter((o: any) => ['delivered', 'cancelled'].includes(o?.status));
    } else {
      const list = guestOrders && guestOrders.length > 0 ? guestOrders : (guestOrder ? [guestOrder] : []);
      return list.filter((o: any) => ['delivered', 'cancelled'].includes(o?.status));
    }
  }, [orders, guestOrders, guestOrder, user]);

  const getStatusIndex = (status: string) => {
    switch(status) {
      case 'pending': return 0;
      case 'cooking': return 1;
      case 'delivering': 
      case 'ready': return 2;
      default: return -1;
    }
  };

  const statusIndex = activeOrder ? getStatusIndex(activeOrder.status) : -1;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const formatEstimatedTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col font-sans pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#14141E]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Volver al Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="text-center">
            <h1 className="font-display font-black uppercase text-lg tracking-widest text-white">{t('my_orders')}</h1>
            <p className="text-[10px] text-green-500 font-mono tracking-widest uppercase">{t('brand_name')}</p>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-4 pt-2">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'active' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {t('in_progress')} {activeOrders.length > 0 ? `(${activeOrders.length})` : ''}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {t('history')} ({historyOrders.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 mt-4">
        
        {activeTab === 'active' && (
          <div className="animate-fade-in">
            {!activeOrder ? (
              <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🍕</span>
                </div>
                <h2 className="text-xl font-display font-black text-white uppercase mb-2">{t('no_active_orders')}</h2>
                <p className="text-zinc-500 text-sm mb-8">{t('hungry_check_menu')}</p>
                <button 
                  onClick={onBack}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]"
                >
                  {t('explore_menu')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Multi-Order Tab Selector when customer has >1 concurrent orders */}
                {activeOrders.length > 1 && (
                  <div className="bg-[#14141E] border border-zinc-800 p-3 rounded-2xl">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">
                      Tienes {activeOrders.length} pedidos en preparación simultánea:
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {activeOrders.map((ord: any, idx: number) => {
                        const isSelected = (activeOrder?.id === ord.id);
                        const methodIcon = ord.delivery_method === 'delivery' ? '🛵' : '🛍️';
                        const methodLabel = ord.delivery_method === 'delivery' ? 'Domicilio' : 'Recogida';
                        const statusLabel = ord.status === 'pending' ? 'Recibido' : ord.status === 'cooking' ? 'En Horno' : (ord.delivery_method === 'delivery' ? 'En Reparto' : 'Listo Mostrador');

                        return (
                          <button
                            key={ord.id}
                            onClick={() => setSelectedOrderIndex(idx)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                              isSelected 
                                ? (ord.delivery_method === 'pickup' ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]')
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                            }`}
                          >
                            <span>{methodIcon}</span>
                            <span>{methodLabel} #{ord.id.slice(0, 5)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                              ord.status === 'cooking' ? 'bg-orange-500/20 text-orange-400' :
                              ord.status === 'ready' || ord.status === 'delivering' ? (ord.delivery_method === 'pickup' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400') :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {statusLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Order Card */}
                <div className="bg-[#14141E] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                  
                  {/* Status Banner */}
                  <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-[#14141E] to-zinc-900">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono uppercase tracking-widest text-green-400 bg-green-500/10 px-2.5 py-1 rounded-md border border-green-500/20">
                            {t('order_num', 'Pedido')}: #{activeOrder.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            activeOrder.delivery_method === 'pickup'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}>
                            {activeOrder.delivery_method === 'pickup' ? '🛍️ Recogida en Pizzería' : '🛵 Envío a Domicilio'}
                          </span>
                        </div>

                        <h3 className="text-xl font-display font-black uppercase text-white mt-2">
                          {activeOrder.delivery_method === 'pickup' ? 'Recogida en Mostrador' : 'Reparto a Domicilio'}
                        </h3>

                        {activeOrder.estimated_ready_at && (
                          <p className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                            <span>⏰</span>
                            <span>
                              {activeOrder.delivery_method === 'pickup' ? 'Listo aprox. a las:' : 'Entrega aprox. a las:'} {formatEstimatedTime(activeOrder.estimated_ready_at)}
                            </span>
                          </p>
                        )}

                        {/* Payment mode badge */}
                        <div className="mt-2.5">
                          {activeOrder.payment_method === 'physical' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                              <span>💵</span>
                              <span>
                                {activeOrder.delivery_method === 'pickup'
                                  ? `Pago en efectivo al recoger en mostrador (${activeOrder.total_amount} €)`
                                  : `Pago en efectivo al repartidor (${activeOrder.total_amount} €)`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                              <span>💳</span>
                              <span>Pago seguro verificado online</span>
                            </span>
                          )}
                        </div>

                        {activeOrder.client_phone && (
                          pushStatus === 'subscribed' ? (
                            <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                              <p className="text-xs text-green-400 font-bold flex items-center gap-1">🔔 Te avisaremos cuando cambie el estado</p>
                              <button
                                type="button"
                                onClick={() => void unlockAudio(true)}
                                className="text-[11px] bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/30 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                              >
                                <span>🔊</span>
                                <span>Probar sonido</span>
                              </button>
                            </div>
                          ) : pushStatus === 'denied' ? (
                            <p className="text-xs text-zinc-500 mt-2.5">Notificaciones bloqueadas por el navegador</p>
                          ) : pushStatus !== 'unsupported' && (
                            <button
                              onClick={() => subscribeToPush(activeOrder.client_phone)}
                              disabled={pushStatus === 'subscribing'}
                              className="text-xs text-green-400 hover:text-green-300 font-bold mt-2.5 underline disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>🔔</span>
                              <span>{pushStatus === 'subscribing' ? 'Activando avisos…' : 'Avisarme cuando cambie el estado'}</span>
                            </button>
                          )
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-white">{activeOrder.total_amount}€</span>
                        <p className="text-xs text-zinc-500 font-medium uppercase mt-1">
                          {activeOrder.delivery_method === 'pickup' ? 'Para recoger' : 'A domicilio'}
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative pt-8 pb-4">
                      {/* Progress Bar Background */}
                      <div className="absolute top-[42px] left-[10%] right-[10%] h-1 bg-zinc-800 rounded-full"></div>
                      {/* Active Progress Bar */}
                      <div 
                        className={`absolute top-[42px] left-[10%] h-1 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse ${
                          activeOrder.delivery_method === 'pickup' && statusIndex >= 2 ? 'bg-emerald-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${statusIndex === 0 ? 0 : statusIndex === 1 ? 40 : 80}%` }}
                      ></div>

                      <div className="relative flex justify-between">
                        {/* Step 1: Pending */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 0 ? 'animate-bounce' : ''}`}>
                            ⏳
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>{t('status_received')}</span>
                        </div>

                        {/* Step 2: Cooking */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 1 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 1 ? 'animate-bounce' : ''}`}>
                            🔥
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 1 ? 'text-orange-500' : 'text-zinc-600'}`}>
                            {activeOrder.delivery_method === 'pickup' ? 'En Horno' : t('status_cooking')}
                          </span>
                        </div>

                        {/* Step 3: Delivering/Ready */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 2 ? (activeOrder.delivery_method === 'pickup' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]') : 'bg-zinc-800 text-zinc-600'} ${statusIndex === 2 ? 'animate-bounce' : ''}`}>
                            {activeOrder.delivery_method === 'delivery' ? '🛵' : '🛍️'}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 2 ? (activeOrder.delivery_method === 'pickup' ? 'text-emerald-400 font-black' : 'text-blue-400') : 'text-zinc-600'}`}>
                            {activeOrder.delivery_method === 'delivery' ? t('status_delivering_title') : 'Listo para Recoger'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Message Box */}
                    {(statusIndex < 2 || activeOrder.delivery_method === 'delivery') && (
                      <div className="mt-8 bg-[#0A0A0E] rounded-2xl p-4 border border-zinc-800 text-center">
                        <p className="text-sm text-zinc-300 font-medium">
                          {statusIndex === 0 && (
                            activeOrder.delivery_method === 'pickup'
                              ? '⏳ Hemos recibido tu pedido para recoger en local. En unos minutos comenzaremos a hornearlo.'
                              : t('tracking_msg_pending')
                          )}
                          {statusIndex === 1 && (
                            activeOrder.delivery_method === 'pickup'
                              ? '🔥 Tu pedido se está horneando con mimo en cocina. Te avisaremos en cuanto esté listo para recoger.'
                              : t('tracking_msg_cooking')
                          )}
                          {statusIndex === 2 && activeOrder.delivery_method === 'delivery' && t('tracking_msg_delivering')}
                        </p>
                      </div>
                    )}

                    {/* Ready Alert for Pickup */}
                    {statusIndex === 2 && activeOrder.delivery_method === 'pickup' && (
                      <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-green-900/60 to-emerald-950/80 border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.35)] text-center animate-pulse">
                        <span className="text-3xl block mb-2">🎉</span>
                        <h4 className="font-display font-black text-lg text-emerald-400 uppercase tracking-wide">
                          ¡TU PEDIDO YA ESTÁ LISTO EN MOSTRADOR!
                        </h4>
                        <p className="text-sm text-zinc-200 mt-1 max-w-md mx-auto font-medium">
                          Pásate a por él cuando quieras por nuestra pizzería. Tu comida te espera recién salida del horno.
                        </p>
                      </div>
                    )}

                    {/* Store Pickup Location Card */}
                    {activeOrder.delivery_method === 'pickup' && (
                      <div className="mt-5 bg-[#0A0A0E] rounded-2xl p-4 sm:p-5 border border-zinc-800 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                              Punto de Recogida
                            </span>
                            <h4 className="font-display font-black text-white text-base">
                              Néstor Pizzas Caniles
                            </h4>
                            <p className="text-xs text-zinc-300 mt-1 flex items-center gap-1.5">
                              <span>📍</span>
                              <span>Calle Alcalde Felip, 9, 18810 Caniles (Granada)</span>
                            </p>
                            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                              <span>📞</span>
                              <span>Teléfono cocina: <strong className="text-zinc-200">+34 679 76 19 87</strong></span>
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-2xl">
                            🍕
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-zinc-800/80">
                          <a
                            href="https://maps.google.com/?q=Nestor+Pizzas+Calle+Alcalde+Felip+9+Caniles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700 text-center"
                          >
                            <span>🗺️</span>
                            <span>Cómo Llegar</span>
                          </a>
                          <a
                            href="tel:+34679761987"
                            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700 text-center"
                          >
                            <span>📞</span>
                            <span>Llamar al Local</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Delivery Address Card */}
                    {activeOrder.delivery_method === 'delivery' && activeOrder.delivery_address && (
                      <div className="mt-5 bg-[#0A0A0E] rounded-2xl p-4 sm:p-5 border border-zinc-800 text-left">
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest block mb-1">
                          Dirección de Entrega
                        </span>
                        <p className="text-sm text-zinc-200 flex items-start gap-2 mt-1">
                          <span>🏠</span>
                          <span>{activeOrder.delivery_address}</span>
                        </p>
                        {statusIndex === 2 && (
                          <p className="text-xs text-blue-400 font-bold mt-2 flex items-center gap-1.5">
                            <span>🛵</span>
                            <span>El repartidor va de camino a tu dirección</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('order_summary')}</h4>
                    {(() => {
                      const vipInfo = getOrderVipRedemptionInfo(activeOrder);
                      return (
                        <>
                          <div className="space-y-3">
                            {activeOrder.order_items?.map((item: any) => {
                              const isRedeemedItem = vipInfo.hasVipRedemption && (
                                item?.customization_details?.is_vip_reward === true ||
                                (vipInfo.redeemedItemId !== null && item.id === vipInfo.redeemedItemId)
                              );
                              return (
                                <div key={item.id} className={`flex justify-between items-center text-sm ${isRedeemedItem ? 'bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl' : ''}`}>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                                    <span className="text-zinc-200 font-bold">{item.customization_details?.name || item.products?.name}</span>
                                    {isRedeemedItem && (
                                      <span className="bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                        🎁 CANJEADO CON {vipInfo.pointsRedeemed} PTOS VIP (GRATIS -{Number(vipInfo.discountApplied).toFixed(2)}€)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {vipInfo.hasVipRedemption && (
                            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-black text-amber-400 uppercase block">
                                  🎁 Canje Club VIP (-{vipInfo.pointsRedeemed} ptos)
                                </span>
                                <span className="text-zinc-300">
                                  Producto canjeado: <strong className="text-white">{vipInfo.redeemedProductName}</strong>
                                </span>
                              </div>
                              <span className="font-black text-emerald-400 text-sm">
                                -{Number(vipInfo.discountApplied).toFixed(2)} €
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in space-y-4">
            {historyOrders.length === 0 ? (
              <div className="text-center py-20 bg-[#14141E] rounded-3xl border border-zinc-800">
                <span className="text-4xl mb-4 block">📜</span>
                <p className="text-zinc-500 font-medium">{t('no_completed_orders')}</p>
              </div>
            ) : (
              historyOrders.map((order: any) => {
                const vipInfo = getOrderVipRedemptionInfo(order);
                return (
                <div key={order.id} className="bg-[#14141E] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-zinc-400 font-medium">{formatDate(order.created_at)}</span>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {order.status === 'delivered' ? (
                          <span className="text-[10px] font-bold uppercase text-green-400 bg-green-500/10 px-2 py-1 rounded">
                            {order.delivery_method === 'pickup' ? '🛍️ Recogido en Local' : '🛵 Entregado en Domicilio'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-1 rounded">{t('status_cancelled_title')}</span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500 uppercase bg-zinc-900 px-2 py-1 rounded">ID: {order.id.slice(0,8)}</span>
                        {vipInfo.hasVipRedemption && (
                          <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded">
                            🎁 CANJE {vipInfo.pointsRedeemed} PTOS VIP: {vipInfo.redeemedProductName} (-{Number(vipInfo.discountApplied).toFixed(2)}€)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-white">{order.total_amount}€</span>
                  </div>
                  
                  <div className="mt-4 space-y-1.5">
                    {order.order_items?.map((item: any) => {
                      const isRedeemedItem = vipInfo.hasVipRedemption && (
                        item?.customization_details?.is_vip_reward === true ||
                        (vipInfo.redeemedItemId !== null && item.id === vipInfo.redeemedItemId)
                      );
                      return (
                        <div key={item.id} className="text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
                          <span><span className="font-bold text-zinc-300">{item.quantity}x</span> {item.customization_details?.name || item.products?.name}</span>
                          {isRedeemedItem && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                              🎁 Canjeado con {vipInfo.pointsRedeemed} ptos (-{Number(vipInfo.discountApplied).toFixed(2)}€)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
