import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

export default function UserModal() {
  const { isUserModalOpen, closeUserModal, userModalView, setModalView, setLegalDoc, activeLegalDoc, user, profile, logout, orders } = useAuthStore();
  useHardwareBack(isUserModalOpen, closeUserModal);
  const { addItem, clearCart } = useCartStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editCP, setEditCP] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const { updateProfile } = useAuthStore();

  const formatAddress = (addrString: string | undefined | null) => {
    if (!addrString) return '-';
    try {
      const parsed = JSON.parse(addrString);
      if (parsed.street) {
        return `${parsed.street} ${parsed.number ? ', Nº ' + parsed.number : ''}`;
      }
    } catch (e) {
      // Return as is if not JSON
    }
    return addrString;
  };

  // Pre-fill states if profile loads after modal opens
  React.useEffect(() => {
    if (profile) {
      setEditPhone(profile.phone || '');
      try {
        const parsed = JSON.parse(profile.address || '{}');
        if (parsed.street) {
          setEditStreet(parsed.street || '');
          setEditNumber(parsed.number || '');
          setEditCP(parsed.cp || '');
          setEditNotes(parsed.notes || '');
        } else {
          setEditStreet(profile.address || '');
        }
      } catch (e) {
        setEditStreet(profile.address || '');
      }
    }
  }, [profile, isUserModalOpen]);
  
  if (!isUserModalOpen) return null;

  const handleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      closeUserModal();
    }
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      if (data.user) {
        await supabase.from('profiles').update({ email: email, phone: registerPhone }).eq('id', data.user.id);
      }
      if (!data.session) {
        setModalView('check-email');
      } else {
        setModalView('profile');
      }
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Por favor ingresa tu email para recuperar la contraseña.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg('Te hemos enviado un correo con las instrucciones.');
    }
  };

  const processAccountDeletion = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      
      // Clear session locally
      await supabase.auth.signOut();
      logout();
      setModalView('delete-success');
    } catch (error: any) {
      setErrorMsg('No se pudo eliminar la cuenta. ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const addressJson = JSON.stringify({
        street: editStreet,
        number: editNumber,
        cp: editCP,
        notes: editNotes
      });
      await updateProfile({ phone: editPhone, address: addressJson });
      setModalView('profile');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al actualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };


  const handleRepeatOrder = (order: any) => {
    if (!order.order_items) return;
    clearCart();
    order.order_items.forEach((item: any) => {
       if (item.products) {
         addItem({
           id: Math.random().toString(36).substring(7),
           productId: item.products.id,
           name: item.products.name,
           price: item.unit_price,
           quantity: item.quantity,
           size: item.size || 'normal'
         });
       }
    });
    closeUserModal();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">PENDIENTE</span>;
      case 'cooking': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">COCINANDO</span>;
      case 'delivering': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">EN REPARTO</span>;
      case 'delivered': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">ENTREGADO</span>;
      case 'cancelled': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">CANCELADO</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      <div className="bg-[#1A1A24] border border-green-500/30 rounded-3xl shadow-2xl w-full max-w-lg sm:max-w-xl overflow-hidden relative max-h-[85vh] sm:max-h-[90vh] animate-fade-in-up">
        
        {/* Botón Cerrar */}
        <button onClick={closeUserModal} className="absolute top-4 right-4 bg-[#14141E] text-gray-400 hover:text-white p-2 rounded-xl border border-white/5 hover:border-red-500/50 transition-all z-[1200] cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Header del Modal */}
        <div className="bg-[#101018] px-6 py-8 text-center border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-zinc-950 rounded-2xl border border-green-500/40 p-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v4H8v2h3v3h2v-3h3v-2h-3V7z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">{(user || profile) ? 'Mi Cuenta VIP' : 'Néstor Pizzas'}</h2>
            <p className="text-sm text-gray-400 mt-1">{(user || profile) ? 'Club de Fidelización y Pedidos' : 'Inicia sesión para acumular puntos'}</p>
          </div>
        </div>

        {/* Contenedor Dinámico (Vistas) */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] no-scrollbar">
          
          {profile?.is_admin && userModalView !== 'legal' && userModalView !== 'legal-doc' && userModalView !== 'delete-account' && userModalView !== 'delete-success' ? (
            <div className="space-y-4 text-center py-6">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/50 mb-4 animate-pulse">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-display font-black text-white uppercase mb-2">Sesión Administrativa</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-red-500/10 border border-red-500/20 p-4 rounded-xl">Estás usando una cuenta con privilegios de administrador. Los pedidos personales y los puntos de fidelidad están deshabilitados para no cruzar datos del TPV. Por favor, utiliza otra cuenta para pedidos personales.</p>
              
              <button onClick={logout} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-6 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                Cerrar Sesión Admin
              </button>
            </div>
          ) : userModalView === 'login' ? (
            <div className="space-y-3">
              <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-bold py-3 px-4 rounded-xl transition-all hover:bg-gray-100 text-sm mb-4">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </button>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-medium uppercase">O con tu email</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email / Teléfono</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                <div className="relative w-full">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-600 text-green-500 bg-[#14141E] focus:ring-green-500 focus:ring-offset-black" />
                  <span className="text-xs text-gray-400">Recordarme</span>
                </label>
                <button type="button" onClick={() => setModalView('forgot-password')} className="text-xs text-green-400 hover:text-green-300 hover:underline">¿Olvidaste tu contraseña?</button>
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleLogin} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl uppercase tracking-wide text-sm shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all mt-2 disabled:opacity-50">
                {isLoading ? 'Cargando...' : 'Entrar'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                ¿No tienes cuenta? <button onClick={() => setModalView('register')} className="text-green-400 font-bold hover:underline">Regístrate</button>
              </p>
            </div>
          ) : userModalView === 'forgot-password' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 text-center mb-4">Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.</p>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
              </div>
              
              {errorMsg && (
                <div className={`border text-sm text-center p-3 rounded-xl mt-2 animate-fade-in font-medium ${errorMsg.includes('enviado') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleResetPassword} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wide text-sm shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all mt-4 disabled:opacity-50">
                {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
              </button>
              <button onClick={() => setModalView('login')} className="w-full bg-transparent hover:bg-white/5 text-gray-400 border border-white/10 font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                Volver
              </button>
            </div>
          ) : userModalView === 'register' ? (
            <div className="space-y-3">
              <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-bold py-3 px-4 rounded-xl transition-all hover:bg-gray-100 text-sm mb-4">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </button>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-medium uppercase">O con tu email</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono</label>
                <input type="tel" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                <div className="relative w-full">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="•••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleRegister} disabled={isLoading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl uppercase tracking-wide text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all mt-2 disabled:opacity-50">
                {isLoading ? 'Cargando...' : 'Crear Cuenta'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                ¿Ya tienes cuenta? <button onClick={() => setModalView('login')} className="text-green-400 font-bold hover:underline">Entra aquí</button>
              </p>
            </div>
          ) : userModalView === 'profile' ? (
            <div className="space-y-4 text-left pb-4">
              {/* Puntos */}
              <div className="bg-gradient-to-br from-green-900/30 to-[#14141E] border border-green-500/30 rounded-2xl p-5 text-center">
                <h3 className="text-xl font-display font-black text-white uppercase mb-1">¡Hola, <span className="text-green-400">{profile?.full_name || user?.email?.split('@')[0] || 'Usuario'}</span>!</h3>
                <p className="text-sm text-gray-300">Bienvenido al Club VIP de Caniles</p>
                
                <div className="mt-4 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Puntos Acumulados</span>
                  <span className="text-5xl font-display font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">{profile?.points || 0}</span>
                </div>
              </div>
              
              {/* Mis Datos */}
              <div className="bg-[#14141E] border border-white/5 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mis Datos</h4>
                  <button onClick={() => setModalView('edit-profile')} className="text-[10px] text-green-500 hover:text-green-400 font-bold uppercase tracking-wider px-2 py-1 bg-green-500/10 rounded-lg transition-colors">Editar</button>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Teléfono:</span>
                    <span className="font-medium text-white">{profile?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Dirección:</span>
                    <span className="font-medium text-white text-right max-w-[65%] leading-tight">{formatAddress(profile?.address)}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Pedidos */}
              <button onClick={() => setModalView('orders')} className="w-full bg-[#14141E] hover:bg-[#1E1E2C] border border-white/5 text-left px-4 py-4 rounded-2xl text-sm text-gray-300 font-medium transition-all flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  </div>
                  <span className="font-bold text-white uppercase tracking-wider">Historial de Pedidos</span>
                </div>
                <svg className="w-5 h-5 text-gray-600 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>

              {/* Recompensas */}
              <div className="bg-[#14141E] border border-white/5 rounded-2xl p-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recompensas Disponibles</h4>
                <div className="space-y-2.5">
                  {/* Recompensa 1 */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-[#1A1A24] hover:border-green-500/30 transition-all">
                    <div>
                      <div className="text-yellow-400 font-bold text-sm">25 pts</div>
                      <div className="text-white text-[11px] font-medium">Pizza/Hamburguesa Gratis</div>
                    </div>
                    <button className={`text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${(profile?.points || 0) >= 25 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                      {(profile?.points || 0) >= 25 ? 'Desbloqueado' : 'Bloqueado'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-left bg-[#1A1A24] p-4 rounded-xl border border-white/5">
                <h4 className="text-[11px] font-bold text-white uppercase mb-1">💡 ¿Cómo funciona?</h4>
                <p className="text-sm text-gray-300 leading-relaxed">Acumulas puntos automáticamente con cada pedido confirmado. Obtienes 4 puntos por cada 10€ gastados. Con 25 puntos puedes canjear una pizza o hamburguesa gratis.</p>
              </div>

              <button onClick={logout} className="w-full bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                Cerrar Sesión
              </button>
            </div>
          ) : userModalView === 'orders' ? (
            <div className="space-y-4 text-left pb-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setModalView('profile')} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">Mis Pedidos</h3>
              </div>
              
              {(!orders || orders.length === 0) ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center text-4xl mb-2">
                    🍕
                  </div>
                  <h4 className="font-display font-bold text-white text-lg">Aún no hay pedidos</h4>
                  <p className="text-sm text-zinc-400 px-4">Tu estómago ruge... ¡Es hora de hacer tu primer pedido!</p>
                  <button onClick={() => { closeUserModal(); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="mt-4 px-6 py-2 bg-green-600 text-white font-bold text-sm uppercase rounded-xl">
                    Ver Menú
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                  {(orders || []).map((order: any) => (
                    <div key={order.id} className="bg-[#14141E] border border-white/5 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">
                            {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-right">
                          <span className="font-black text-white text-lg">{Number(order.total_amount).toFixed(2)}€</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 mb-4">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="text-sm text-zinc-300 flex justify-between">
                            <span><span className="text-green-500 font-bold">{item.quantity}x</span> {item.products?.name || 'Producto'}</span>
                          </div>
                        ))}
                      </div>
                      
                      {order.status === 'delivered' && (
                        <button onClick={() => handleRepeatOrder(order)} className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          Repetir Pedido
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : userModalView === 'edit-profile' ? (
            <div className="space-y-4 text-left pb-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-2 text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full mx-auto flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h3 className="text-xl font-display font-black text-yellow-500 uppercase mb-2">Completar Datos de Entrega</h3>
                <p className="text-xs text-gray-300">Para poder enviar tus pedidos a domicilio o contactarte si surge un imprevisto, necesitamos conocer tu teléfono y dirección.</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono <span className="text-red-500">*</span></label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="Ej: 600 000 000" />
              </div>
              
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Calle <span className="text-red-500">*</span></label>
                  <input type="text" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="Ej: Calle Amapola" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Número <span className="text-red-500">*</span></label>
                  <input type="text" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="Ej: 1" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CP <span className="text-red-500">*</span></label>
                  <input type="text" value={editCP} onChange={e => setEditCP(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="18810" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Detalles o Notas (Opcional)</label>
                <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" placeholder="Piso, puerta, etc." />
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleUpdateProfile} disabled={isLoading || !editPhone || !editStreet || !editNumber || !editCP} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wide text-sm shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all mt-4 disabled:opacity-50">
                {isLoading ? 'Guardando...' : 'Guardar Información'}
              </button>
              
              {profile?.phone && profile?.address && (
                <button onClick={() => setModalView('profile')} className="w-full bg-transparent hover:bg-white/5 text-gray-400 border border-white/10 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                  Cancelar
                </button>
              )}
            </div>
          ) : null}

          {userModalView === 'legal' && (
            <div className="space-y-4 text-left pb-4">
              <h3 className="text-xl font-display font-black text-white uppercase mb-1 text-center">Centro Legal</h3>
              <p className="text-sm text-gray-400 text-center mb-6">Transparencia y normativas RGPD</p>
              
              <div className="space-y-2">
                <button onClick={() => setLegalDoc('Política de Privacidad')} className="w-full bg-[#14141E] hover:bg-[#1E1E2C] border border-white/5 text-left px-4 py-3.5 rounded-xl text-sm text-gray-300 font-medium transition-all flex justify-between items-center group">
                  <span>Política de Privacidad</span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button onClick={() => setLegalDoc('Términos y Condiciones')} className="w-full bg-[#14141E] hover:bg-[#1E1E2C] border border-white/5 text-left px-4 py-3.5 rounded-xl text-sm text-gray-300 font-medium transition-all flex justify-between items-center group">
                  <span>Términos y Condiciones</span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button onClick={() => setLegalDoc('Uso y Tratamiento de Datos')} className="w-full bg-[#14141E] hover:bg-[#1E1E2C] border border-white/5 text-left px-4 py-3.5 rounded-xl text-sm text-gray-300 font-medium transition-all flex justify-between items-center group">
                  <span>Uso y Tratamiento de Datos</span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                
                <div className="pt-4 mt-4 border-t border-white/5">
                  <button onClick={() => setModalView('delete-account')} className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-left px-4 py-3.5 rounded-xl text-sm text-red-400 font-medium transition-all flex justify-between items-center group">
                    <span>Solicitar Eliminación de Cuenta</span>
                    <svg className="w-4 h-4 text-red-500/50 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
              
              <button onClick={() => setModalView(user ? 'profile' : 'login')} className="w-full bg-transparent hover:bg-white/5 text-gray-400 border border-white/10 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4">
                ← Volver
              </button>
            </div>
          )}

          {userModalView === 'legal-doc' && (
            <div className="space-y-4 text-left pb-4 text-sm">
              <h3 className="text-xl font-display font-black text-white uppercase mb-1 text-center">{activeLegalDoc}</h3>
              
              <div className="bg-[#14141E] border border-white/5 rounded-2xl p-4 max-h-[50vh] overflow-y-auto no-scrollbar text-gray-400 text-sm leading-relaxed space-y-3">
                <p><strong>Última actualización:</strong> Julio de 2026</p>
                <p>En cumplimiento con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), Néstor Pizzas (en adelante, "la Empresa") informa a los usuarios sobre las políticas de uso, almacenamiento y tratamiento de los datos recabados en la presente plataforma digital.</p>
                <p>Los datos personales proporcionados (tales como nombre, teléfono y dirección) son estrictamente utilizados para la correcta gestión y entrega de los pedidos, así como para la acumulación de puntos en el programa de fidelización VIP. Estos datos se almacenan en servidores seguros con encriptación de extremo a extremo.</p>
                <p>El usuario tiene derecho, en todo momento, a ejercer sus derechos de acceso, rectificación, cancelación y oposición (derechos ARCO) a través del Centro Legal de esta aplicación, seleccionando la opción correspondiente o contactando directamente con nuestro soporte.</p>
                <p>Al continuar utilizando nuestros servicios, usted acepta incondicionalmente estos términos y confirma que ha leído nuestra política al completo.</p>
              </div>
              
              <button onClick={() => setModalView('legal')} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                Entendido y Aceptar
              </button>
            </div>
          )}

          {userModalView === 'delete-account' && (
            <div className="space-y-4 text-left pb-4">
              <h3 className="text-xl font-display font-black text-red-500 uppercase mb-1 text-center">Baja de Usuario</h3>
              <p className="text-sm text-gray-400 text-center mb-6">Lamentamos que quieras irte. Ayúdanos a mejorar.</p>
              
              <div className="bg-[#14141E] border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-gray-400 uppercase">¿Por qué deseas eliminar tu cuenta?</label>
                <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full bg-[#1A1A24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors">
                  <option value="" disabled>Selecciona un motivo...</option>
                  <option value="No uso la aplicación">No uso la aplicación</option>
                  <option value="Recibo demasiadas notificaciones">Recibo demasiadas notificaciones</option>
                  <option value="Problemas con mis pedidos">Problemas con mis pedidos</option>
                  <option value="Me mudo a otra ciudad">Me mudo a otra ciudad</option>
                  <option value="Otro">Otro motivo</option>
                </select>
                
                {deleteReason === 'Otro' && (
                  <textarea rows={2} placeholder="Explícanos tu motivo..." className="w-full bg-[#1A1A24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors mt-2"></textarea>
                )}
                
                <label className="flex items-start gap-3 cursor-pointer mt-4 pt-4 border-t border-white/5">
                  <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} className="mt-1 w-5 h-5 rounded border-gray-600 text-red-500 bg-[#1A1A24] focus:ring-red-500 focus:ring-offset-black" />
                  <span className="text-xs text-gray-400">Entiendo que esta acción es irreversible y todos mis puntos y datos personales serán borrados permanentemente.</span>
                </label>
              </div>
              
              <button disabled={!deleteConfirm} onClick={processAccountDeletion} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4 disabled:opacity-50 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                Confirmar Eliminación Definitiva
              </button>
              <button onClick={() => setModalView('legal')} className="w-full bg-transparent hover:bg-white/5 text-gray-400 border border-white/10 font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                Cancelar
              </button>
            </div>
          )}

          {userModalView === 'delete-success' && (
            <div className="space-y-4 text-center pb-4 py-6">
              <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/50 mb-4 animate-bounce">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-display font-black text-white uppercase mb-2">Cuenta Eliminada</h3>
              <p className="text-sm text-gray-300 leading-relaxed">Tu cuenta y todos tus datos personales han sido borrados de nuestros sistemas permanentemente.</p>
              
              <button onClick={closeUserModal} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-6 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                Cerrar Ventana
              </button>
            </div>
          )}

          {userModalView === 'check-email' && (
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📧</span>
              </div>
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-wider">{t('check_email')}</h2>
              <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto">
                {t('check_email_desc')}
              </p>
              <button
                onClick={() => setModalView('login')}
                className="w-full border-2 border-zinc-700 hover:border-green-500 text-white font-bold py-4 rounded-xl mt-8 transition-colors"
              >
                {t('login')}
              </button>
            </div>
          )}

          {/* Legal Footer Link */}
          {userModalView !== 'legal' && userModalView !== 'legal-doc' && userModalView !== 'delete-account' && userModalView !== 'delete-success' && userModalView !== 'check-email' && (
            <div className="mt-5 text-center border-t border-white/5 pt-4">
              <button onClick={() => setModalView('legal')} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest">
                Páginas Legales y Privacidad
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
