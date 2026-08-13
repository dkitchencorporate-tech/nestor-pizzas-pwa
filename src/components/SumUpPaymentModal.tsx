import React, { useState } from 'react';
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

  // Modo simulación: 3 segundos de espera y luego éxito
  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-xl text-white uppercase">Pago Seguro</h3>
            <p className="text-xs text-zinc-400">SumUp Payment Gateway (Simulación)</p>
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
              <p className="text-zinc-400 text-sm">Preparando tu pedido...</p>
            </div>
          ) : (
            <>
              <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 mb-6">
                <span className="text-sm font-bold text-zinc-400 block mb-1 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-5xl font-display font-black text-white">{amount.toFixed(2)} €</span>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleSimulatePayment} 
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                      Simular Pago con Tarjeta
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-4 text-center">
                * En producción, aquí se cargará el Widget nativo de SumUp.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
