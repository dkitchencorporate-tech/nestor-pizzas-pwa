import React, { useEffect, useState } from 'react';
import { useHardwareBack } from '../utils/useHardwareBack';

interface SumUpPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
}

export const SumUpPaymentModal: React.FC<SumUpPaymentModalProps> = ({ isOpen, onClose, onSuccess, amount }) => {
  useHardwareBack(isOpen, onClose);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Efecto para inicializar el SDK de SumUp (se inyectará script)
  useEffect(() => {
    if (isOpen) {
      // Aquí se inicializa el componente real de SumUp
      // Requiere Client ID y App ID
      // Ejemplo: 
      // SumUpCard.mount({
      //   checkoutId: "TODO_CHECKOUT_ID",
      //   onComplete: () => { setIsSuccess(true); setTimeout(onSuccess, 1500); }
      // });
      console.log('Mounting SumUp Widget for amount:', amount);
    }
  }, [isOpen, amount, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto no-scrollbar">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
        <div className="p-6 pt-8 sm:pt-8 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-xl text-white uppercase">Pago con Tarjeta</h3>
            <p className="text-xs text-zinc-400">SumUp Secure Gateway</p>
          </div>
          {!isProcessing && !isSuccess && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
          )}
        </div>

        <div className="p-6 text-center">
          {isSuccess ? (
            <div className="animate-scale-in">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">¡Pago Aprobado!</h4>
              <p className="text-zinc-400 text-sm">Transacción completada exitosamente.</p>
            </div>
          ) : (
            <>
              <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 mb-6">
                <span className="text-sm font-bold text-zinc-400 block mb-1 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-5xl font-display font-black text-white">{amount.toFixed(2)} €</span>
              </div>
              
              <div id="sumup-card-element" className="min-h-[200px] flex items-center justify-center border border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 mb-4">
                <div className="text-zinc-500 text-sm p-4">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                  <p>Widget de SumUp pendiente de credenciales.</p>
                  <p className="text-[10px] mt-1">(Esperando Client_ID y SDK Keys)</p>
                </div>
              </div>

              {errorMsg && (
                <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
