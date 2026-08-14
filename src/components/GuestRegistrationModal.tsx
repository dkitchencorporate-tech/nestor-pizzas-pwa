import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGuestOrderStore } from '../store/guestOrderStore';
import { useAuthStore } from '../store/authStore';
import { emailService } from '../lib/emailService';

interface GuestRegistrationModalProps {
  isOpen: boolean;
  order: any;
  onSkip: () => void;
  onSuccess: () => void;
}

export default function GuestRegistrationModal({ isOpen, order, onSkip, onSuccess }: GuestRegistrationModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setGuestOrder } = useGuestOrderStore();
  const { fetchProfile, fetchOrders } = useAuthStore();

  if (!isOpen || !order) return null;

  const pointsEarned = Math.floor(order.total_amount / 10) * 4;

  const handleSkip = () => {
    // Si saltan, se quedan como invitados. Guardamos la orden en su persistencia.
    setGuestOrder(order);
    onSkip();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Actualizar perfil con los datos que ya introdujo en el checkout
        // y añadir los puntos que ganó con esta orden.
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: order.client_name,
            email: email,
            phone: order.client_phone,
            address: order.delivery_address, // As a raw string for now
            points: pointsEarned
          })
          .eq('id', data.user.id);

        if (profileError) throw profileError;

        // Reasignar la orden anónima al nuevo usuario
        const { error: orderError } = await supabase
          .from('orders')
          .update({ user_id: data.user.id })
          .eq('id', order.id);

        if (orderError) throw orderError;

        emailService.sendWelcomeEmail(email, order.client_name);

        // Cargar datos en el store global para que el tracking use la sesión logueada
        await fetchProfile(data.user.id);
        await fetchOrders();

        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear la cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
        
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 text-green-500 mb-4 border border-green-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider mb-2">¡Pedido Confirmado!</h2>
            <p className="text-zinc-400 text-sm">Tu pedido ya está en cocina.</p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6 text-center">
            <p className="text-orange-400 font-bold mb-1">¡No pierdas tus puntos!</p>
            <p className="text-zinc-300 text-sm">
              Crea una cuenta rápido y llévate <strong className="text-yellow-400">{pointsEarned} Puntos VIP</strong> por este pedido.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Contraseña</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

            <div className="pt-4 space-y-3">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                ) : 'Sí, Registrarme y Ganar Puntos'}
              </button>
              
              <button 
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full bg-transparent hover:bg-zinc-900 text-zinc-500 font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all border border-zinc-800"
              >
                No quiero puntos, seguir al Tracking
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
