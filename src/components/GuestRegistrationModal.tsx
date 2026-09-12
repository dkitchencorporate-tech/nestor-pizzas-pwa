import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGuestOrderStore } from '../store/guestOrderStore';
import { useAuthStore } from '../store/authStore';
import { emailService } from '../lib/emailService';
import { useI18nStore } from '../store/i18nStore';

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
  const { t } = useI18nStore();

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
      // Comprobamos el teléfono ANTES de crear la cuenta — así nunca queda
      // una cuenta a medias si ese número ya pertenece a otro cliente.
      if (order.client_phone) {
        const { data: phoneTaken } = await supabase.rpc('is_phone_registered', { p_phone: order.client_phone });
        if (phoneTaken) {
          throw new Error('El teléfono de este pedido ya está registrado en otra cuenta. Inicia sesión con esa cuenta para ver este pedido.');
        }
      }

      // Nombre y telefono van como metadata del propio signUp: con la
      // confirmacion de email activada, signUp() no deja sesion activa
      // hasta que se confirma, y el UPDATE de perfil de mas abajo se
      // ejecuta entonces sin auth.uid() -- la RLS no toca ninguna fila, sin
      // error pero sin guardar nada. El trigger handle_new_user (que si
      // corre con permisos de servidor) lee full_name/phone de aqui.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: order.client_name,
            phone: order.client_phone
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Best-effort: solo se aplica de verdad si hay sesion activa. Si no
        // la hay, el trigger ya dejo guardados los datos correctos.
        await supabase
          .from('profiles')
          .update({
            full_name: order.client_name,
            email: email,
            phone: order.client_phone,
            address: order.delivery_address // As a raw string for now
          })
          .eq('id', data.user.id);

        // Reasignar la orden anonima al nuevo usuario y sumar los puntos --
        // via RPC porque, con la confirmacion de email activada, todavia no
        // hay ninguna sesion en este punto (signUp() no la deja hasta que
        // se confirma), asi que se pasa el id explicito del usuario recien
        // creado. El RPC solo deja reclamar si el telefono del pedido
        // coincide con el que se acaba de guardar en el perfil y si el
        // pedido es reciente, para que nadie pueda apropiarse de un pedido
        // ajeno solo por conocer su id.
        const { error: claimError } = await supabase.rpc('claim_guest_order', {
          p_order_id: order.id,
          p_target_user_id: data.user.id
        });
        if (claimError) throw claimError;

        emailService.sendWelcomeEmail(email, order.client_name);

        // Cargar datos en el store global para que el tracking use la sesión logueada
        await fetchProfile(data.user.id);
        await fetchOrders();

        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        setError('Ese teléfono ya está registrado en otra cuenta.');
      } else {
        setError(err.message || t('error_creating_account'));
      }
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
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider mb-2">{t('order_confirmed_title')}</h2>
            <p className="text-zinc-400 text-sm">{t('order_in_kitchen')}</p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6 text-center">
            <p className="text-orange-400 font-bold mb-1">{t('dont_lose_points')}</p>
            <p className="text-zinc-300 text-sm">
              {t('create_account_fast_1')} <strong className="text-yellow-400">{pointsEarned} {t('vip_points_label')}</strong> {t('create_account_fast_2')}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('email_address')}</label>
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
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('password')}</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder={t('min_6_chars')}
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
                ) : t('yes_register_win_points')}
              </button>
              
              <button 
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full bg-transparent hover:bg-zinc-900 text-zinc-500 font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all border border-zinc-800"
              >
                {t('no_points_track_order')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
