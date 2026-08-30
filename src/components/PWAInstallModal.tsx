import React from 'react';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isStandalone: boolean;
  onInstallDirect: () => void;
  canInstallDirect: boolean;
}

export default function PWAInstallModal({
  isOpen,
  onClose,
  isIOS,
  isStandalone,
  onInstallDirect,
  canInstallDirect
}: PWAInstallModalProps) {
  useHardwareBack(isOpen, onClose);
  const { t } = useI18nStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] relative flex flex-col">
        {/* Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-green-500 to-emerald-400"></div>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black border border-green-500/40 p-1 flex items-center justify-center shadow-lg">
                <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-white uppercase tracking-wider">Instalar App Oficial</h3>
                <p className="text-xs text-green-400 font-bold uppercase tracking-widest">Néstor Pizzas PWA</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              ✕
            </button>
          </div>

          {isStandalone ? (
            <div className="text-center py-6">
              <span className="text-5xl block mb-3">🎉</span>
              <h4 className="text-lg font-bold text-white mb-2">¡Ya tienes la App instalada!</h4>
              <p className="text-zinc-400 text-sm">Estás disfrutando de la experiencia nativa de Néstor Pizzas.</p>
              <button onClick={onClose} className="mt-6 w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all">
                Entendido
              </button>
            </div>
          ) : isIOS ? (
            /* Guía Visual Paso a Paso para iPhone / iPad (Safari) */
            <div className="space-y-4">
              <p className="text-sm text-zinc-300">
                Para instalar en tu <strong className="text-white">iPhone o iPad</strong> sigue estos 3 sencillos pasos desde <strong className="text-blue-400">Safari</strong>:
              </p>

              <div className="space-y-3 bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-xs text-white font-bold">Toca el botón Compartir</p>
                    <p className="text-[11px] text-zinc-400">En la barra inferior de Safari, pulsa el icono cuadrado con la flecha hacia arriba (<span className="text-blue-400 font-bold">⎋</span>).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-xs text-white font-bold">Añadir a la pantalla de inicio</p>
                    <p className="text-[11px] text-zinc-400">Desliza hacia abajo en el menú y selecciona <strong className="text-white">"Añadir a la pantalla de inicio"</strong> (<span className="text-green-400 font-bold">➕</span>).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-xs text-white font-bold">Pulsa "Añadir"</p>
                    <p className="text-[11px] text-zinc-400">En la esquina superior derecha, toca <strong className="text-white">"Añadir"</strong> para tener el icono directo en tu móvil.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] mt-2"
              >
                ¡Listo, ya lo he hecho!
              </button>
            </div>
          ) : canInstallDirect ? (
            /* Disparador Directo para Android / Chrome */
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-300">
                Instala la App oficial de Néstor Pizzas para acceder en 1 segundo, acumular puntos VIP y pedir más rápido.
              </p>
              <button 
                onClick={() => {
                  onInstallDirect();
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-display font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(250,204,21,0.4)] transition-all hover:scale-105"
              >
                📲 Instalar App en este Dispositivo
              </button>
              <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white pt-2">
                Ahora no
              </button>
            </div>
          ) : (
            /* Guía para Navegadores de Escritorio / Android sin prompt */
            <div className="space-y-4">
              <p className="text-sm text-zinc-300">
                Puedes instalar la App directamente desde el menú de tu navegador:
              </p>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs text-zinc-300">
                <p>1. Pulsa en el menú del navegador (<strong className="text-white">⋮</strong> o <strong className="text-white">⋯</strong>).</p>
                <p>2. Selecciona <strong className="text-white">"Instalar aplicación"</strong> o <strong className="text-white">"Añadir a pantalla de inicio"</strong>.</p>
              </div>
              <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all">
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
