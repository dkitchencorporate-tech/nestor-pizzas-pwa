import React, { useState } from 'react';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useAuthStore } from '../store/authStore';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export default function ReviewModal({ isOpen, onClose, order }: ReviewModalProps) {
  useHardwareBack(isOpen, onClose);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const { user, openUserModal, setModalView } = useAuthStore();

  if (!isOpen || !order) return null;

  const isGuest = !user;
  const pointsEarned = Math.floor(order.total_amount / 10) * 4;

  const handleSubmit = () => {
    // Aquí se podría enviar la reseña a Supabase en el futuro
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      // Reiniciar estado por si se abre de nuevo
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
      }, 500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.15)] relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
        
        {submitted ? (
          <div className="p-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <span className="text-4xl">💚</span>
            </div>
            <h3 className="text-2xl font-display font-black text-white mb-2 uppercase">¡Gracias por tu reseña!</h3>
            <p className="text-zinc-400 text-sm">Tus comentarios nos ayudan a mejorar cada día.</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 mb-4 border border-orange-500/30">
                <span className="text-3xl">🍕</span>
              </div>
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-wider mb-2">¡Pedido Entregado!</h2>
              <p className="text-zinc-400 text-sm mb-4">Esperamos que disfrutes muchísimo de tu comida.</p>
              
              {pointsEarned > 0 && (
                <div className={`${isGuest ? 'bg-orange-500/10 border-orange-500/30' : 'bg-gradient-to-r from-zinc-900 to-zinc-900 border-yellow-500/30'} border rounded-xl p-4 shadow-sm mx-auto max-w-sm`}>
                  <div className="flex items-center gap-3 justify-center mb-2">
                    <span className="w-6 h-6 rounded bg-orange-600 text-white font-display font-bold flex items-center justify-center text-[10px]">VIP</span>
                    <span className="text-sm font-bold text-white">
                      {isGuest ? '¡Podrías haber ganado ' : 'Has ganado '}
                      <strong className="text-yellow-400">{pointsEarned} ptos</strong>
                      {isGuest ? '!' : ''}
                    </span>
                  </div>
                  {isGuest && (
                    <>
                      <p className="text-xs text-zinc-400 mb-3">No pierdas tus puntos en tu próximo pedido.</p>
                      <button 
                        onClick={() => {
                          onClose();
                          setModalView('register');
                          openUserModal();
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg uppercase tracking-wider text-xs transition-all"
                      >
                        Crear mi cuenta gratis
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6 mt-6">
              <div className="text-center">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">¿Qué te ha parecido?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="transition-transform hover:scale-110 focus:outline-none"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <svg 
                        className={`w-10 h-10 ${star <= (hoverRating || rating) ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-zinc-800'}`} 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  onClick={handleSubmit}
                  disabled={rating === 0}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar Valoración
                </button>
                <button 
                  onClick={onClose}
                  className="w-full bg-transparent hover:bg-zinc-900 text-zinc-500 font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all border border-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
