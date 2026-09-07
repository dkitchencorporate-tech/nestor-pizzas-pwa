import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { emailService } from '../lib/emailService';
import { useAuthStore } from '../store/authStore';

export default function RegisterLanding() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { openUserModal } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: name, phone })
          .eq('id', data.user.id);
        if (profileError) throw profileError;

        emailService.sendWelcomeEmail(email, name);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message === 'User already registered' ? 'Ya existe una cuenta con ese email.' : (err.message || 'No se pudo crear la cuenta.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/50 mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wider mb-3">¡Bienvenido al Club VIP!</h1>
          <p className="text-zinc-400 mb-8">Tu cuenta ya está lista. Empieza a pedir y acumula puntos desde tu primer pedido.</p>
          <a href="/" className="inline-block bg-green-600 hover:bg-green-500 text-white font-display font-black px-8 py-4 rounded-2xl uppercase tracking-wider text-sm shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all hover:scale-105">
            Ir a pedir mi primera pizza →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-black rounded-2xl border border-green-500/40 p-2 shadow-[0_0_25px_rgba(34,197,94,0.25)] mb-5 flex items-center justify-center">
              <img src="/assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas" className="w-full h-full object-contain" />
            </div>
            <span className="inline-block bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              Club VIP · Caniles
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight leading-tight">
              Únete al Club VIP de<br />Néstor Pizzas
            </h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              Regístrate gratis y consigue puntos con cada pedido, canjeables por descuentos. Además, te avisamos
              en cuanto tu pedido esté listo.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 bg-[#14141E] border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nombre</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Teléfono</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors" placeholder="6XX XXX XXX" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors" placeholder="Mínimo 6 caracteres" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 text-green-500 bg-zinc-900 focus:ring-green-500 focus:ring-offset-black" />
              <span className="text-[11px] text-zinc-500 leading-relaxed">
                Acepto la <button type="button" onClick={() => openUserModal('legal')} className="text-green-400 underline">Política de Privacidad</button> de Néstor Pizzas.
              </span>
            </label>

            {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

            <button type="submit" disabled={isLoading || !accepted}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-display font-black py-4 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              {isLoading ? 'Creando cuenta…' : 'Crear mi cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-6">
            <a href="/" className="hover:text-zinc-400 transition-colors">← Volver al menú sin registrarme</a>
          </p>
        </div>
      </div>

      <div className="text-center text-[10px] text-zinc-600 pb-6">
        Néstor Pizzas Gourmet · Calle Alcalde Felip, 9 · 18810 Caniles (Granada)
      </div>
    </div>
  );
}
