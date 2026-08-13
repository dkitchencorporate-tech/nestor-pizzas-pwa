import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export default function UserModal() {
  const { isUserModalOpen, closeUserModal, userModalView, setModalView, setLegalDoc, activeLegalDoc, user, profile, logout } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
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
      setModalView('profile');
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1A1A24] border border-green-500/30 rounded-3xl shadow-2xl w-full max-w-lg sm:max-w-xl overflow-hidden relative max-h-[90vh] overflow-y-auto no-scrollbar animate-fade-in-up">
        
        {/* Botón Cerrar */}
        <button onClick={closeUserModal} className="absolute top-4 right-4 bg-[#14141E] text-gray-400 hover:text-white p-2 rounded-xl border border-white/5 hover:border-red-500/50 transition-all z-[100] cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Header del Modal */}
        <div className="bg-[#101018] px-6 py-8 text-center border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-black rounded-2xl border border-green-500/40 p-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] mb-4 flex items-center justify-center">
                <span className="font-display font-black text-2xl text-white">N</span>
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">Mi Cuenta</h2>
            <p className="text-sm text-gray-400 mt-1">Inicia sesión para acumular puntos</p>
          </div>
        </div>

        {/* Contenedor Dinámico (Vistas) */}
        <div className="p-6">
          {userModalView === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Email / Teléfono</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                <div className="relative w-full">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-600 text-green-500 bg-[#14141E] focus:ring-green-500 focus:ring-offset-black" />
                  <span className="text-sm text-gray-400">Recordarme</span>
                </label>
                <a href="#" className="text-sm text-green-400 hover:text-green-300 hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center p-3 rounded-xl mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleLogin} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wide shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all mt-4 disabled:opacity-50">
                {isLoading ? 'Cargando...' : 'Entrar'}
              </button>
              <p className="text-center text-sm text-gray-400 mt-4">
                ¿No tienes cuenta? <button onClick={() => setModalView('register')} className="text-green-400 font-bold hover:underline">Regístrate</button>
              </p>
            </div>
          )}

          {userModalView === 'register' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Email / Teléfono</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#14141E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="•••••••••" />
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center p-3 rounded-xl mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button onClick={handleRegister} disabled={isLoading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl uppercase tracking-wide shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all mt-4 disabled:opacity-50">
                {isLoading ? 'Cargando...' : 'Crear Cuenta'}
              </button>
              <p className="text-center text-sm text-gray-400 mt-4">
                ¿Ya tienes cuenta? <button onClick={() => setModalView('login')} className="text-green-400 font-bold hover:underline">Entra aquí</button>
              </p>
            </div>
          )}

          {userModalView === 'profile' && (
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
                  <button className="text-[10px] text-green-500 hover:text-green-400 font-bold uppercase tracking-wider px-2 py-1 bg-green-500/10 rounded-lg">Editar</button>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Teléfono:</span>
                    <span className="font-medium text-white">{profile?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Dirección:</span>
                    <span className="font-medium text-white text-right max-w-[65%] leading-tight">{profile?.address || '-'}</span>
                  </div>
                </div>
              </div>

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
          )}

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

          {/* Legal Footer Link */}
          {userModalView !== 'legal' && userModalView !== 'legal-doc' && userModalView !== 'delete-account' && userModalView !== 'delete-success' && (
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
