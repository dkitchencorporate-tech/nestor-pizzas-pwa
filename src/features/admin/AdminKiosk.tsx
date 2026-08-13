import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore';

export default function AdminKiosk() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const { setKioskClientInfo } = useCartStore();
  
  const handleRegisterGhost = async (e: React.FormEvent) => {
    e.preventDefault();
    setKioskClientInfo({ name, phone, email });
    window.location.href = '/';
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <h2 className="text-2xl font-display font-black uppercase text-white tracking-wide mb-6">
        TPV <span className="text-green-500">Kiosko Físico</span>
      </h2>
      <div className="flex gap-6 h-full">
        <div className="w-1/3 bg-[#14141E] border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4 text-white">Nuevo Cliente Local</h3>
          <form onSubmit={handleRegisterGhost} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Teléfono (Obligatorio)</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700 rounded-xl p-3 text-white mt-1" 
                placeholder="Ej. 600123456" 
                required 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Nombre (Opcional)</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700 rounded-xl p-3 text-white mt-1" 
                placeholder="Nombre del cliente" 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Email (Opcional)</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1A1A24] border border-zinc-700 rounded-xl p-3 text-white mt-1" 
                placeholder="Para enviar ticket/promo" 
              />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all">
              Abrir Cuenta / Iniciar Pedido
            </button>
          </form>
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-[11px] text-yellow-500 leading-relaxed">
              Si el cliente luego descarga la App y se registra con este Teléfono/Email, sus puntos se sincronizarán automáticamente.
            </p>
          </div>
        </div>

        <div className="flex-1 bg-[#14141E] border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-zinc-600">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <p className="font-bold">Abre un ticket para empezar a añadir productos.</p>
        </div>
      </div>
    </div>
  );
}
