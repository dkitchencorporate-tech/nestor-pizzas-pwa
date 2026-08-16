import React, { useState } from 'react';
import { emailService } from '../../../lib/emailService';

interface MarketingCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCount: number;
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({ isOpen, onClose, userCount }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      await emailService.sendMarketingCampaign(subject, message, userCount);
      alert('¡Campaña publicitaria enviada correctamente!');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al enviar la campaña.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="font-display font-black text-xl text-white uppercase">Campaña Publicitaria</h3>
            <p className="text-xs text-zinc-400">Envío masivo ({userCount} destinatarios)</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
        </div>

        <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Asunto del Correo</label>
            <input 
              type="text" 
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej: ¡2x1 en Pizzas Familiares este Fin de Semana!"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Mensaje HTML / Texto</label>
            <textarea 
              required
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe el cuerpo de tu correo aquí..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors custom-scrollbar"
            ></textarea>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-2">
            <p className="text-xs text-blue-400 leading-relaxed">
              <strong>Nota de Integración:</strong> Este panel simula el envío a través de Resend. Para envíos reales a gran escala se requiere un backend (Edge Functions) para proteger la API Key de Resend.
            </p>
          </div>

          <button 
            type="submit"
            disabled={isSending || userCount === 0}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSending ? 'Enviando...' : `Enviar a ${userCount} usuarios`}
          </button>
        </form>
      </div>
    </div>
  );
};
