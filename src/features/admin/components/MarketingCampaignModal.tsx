import React, { useState } from 'react';

interface MarketingCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCount: number;
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({ isOpen, onClose, userCount }) => {
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [message, setMessage] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [ctaText, setCtaText] = useState('¡Pedir Ahora en la App!');
  const [ctaUrl, setCtaUrl] = useState('https://nestorpizzas.es');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      // Simulación de envío masivo con remitente corporativo
      await new Promise(res => setTimeout(res, 1200));
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Error al enviar la campaña.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600"></div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-[#0e0e16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 font-bold text-lg">
              📧
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-wider">Campaña de Email Marketing</h3>
              <p className="text-xs text-zinc-400">
                Remitente Oficial: <strong className="text-green-400 font-mono">tupizza@nestorpizzas.es</strong> &bull; <span className="text-white font-bold">{userCount} destinatarios</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                ✏️ Redactar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'preview' ? 'bg-green-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                👁️ Vista Previa
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 border border-zinc-800">✕</button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {sendSuccess ? (
            <div className="text-center py-16">
              <span className="text-6xl block mb-4">🚀</span>
              <h4 className="text-2xl font-black text-white uppercase">¡Campaña Enviada con Éxito!</h4>
              <p className="text-zinc-400 text-sm mt-2">El boletín promocional ha sido despachado a los {userCount} clientes registrados.</p>
            </div>
          ) : activeTab === 'editor' ? (
            <form onSubmit={handleSend} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Asunto del Correo (Subject)</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: 🍕 ¡Vuelven los Jueves Locos y Nueva Pizza Barbacoa Gourmet!"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-white transition-colors outline-none font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Titular Destacado (Opcional)</label>
                  <input 
                    type="text" 
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    placeholder="Ej: ¡Fin de Semana Especial en Caniles!"
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-2.5 text-white transition-colors outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">URL de Imagen / Flyer (Opcional)</label>
                  <input 
                    type="url" 
                    value={flyerUrl}
                    onChange={e => setFlyerUrl(e.target.value)}
                    placeholder="https://.../promo_flyer.jpg"
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-2.5 text-white transition-colors outline-none text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Cuerpo del Mensaje / Oferta</label>
                <textarea 
                  required
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribe el texto de la promoción, código de descuento o novedades del menú..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-white transition-colors outline-none text-sm custom-scrollbar"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Texto del Botón (CTA)</label>
                  <input 
                    type="text" 
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-2.5 text-white transition-colors outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Enlace de Destino (Link)</label>
                  <input 
                    type="url" 
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-green-500 rounded-xl px-4 py-2.5 text-white transition-colors outline-none text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSending || userCount === 0}
                  className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSending ? 'Despachando...' : `🚀 Enviar Campaña a ${userCount} Clientes`}
                </button>
              </div>
            </form>
          ) : (
            /* Vista Previa del Email (Diseño Corporativo Blanco con Acentos Verde/Rojo) */
            <div className="max-w-2xl mx-auto bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans">
              
              {/* Header Email */}
              <div className="bg-slate-900 p-6 text-center border-b-4 border-green-500 relative">
                <div className="w-16 h-16 bg-black rounded-2xl p-1 mx-auto mb-2 border border-green-500/50 shadow-md">
                  <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-xl font-black uppercase text-white tracking-wider m-0">NÉSTOR PIZZAS GOURMET</h2>
                <p className="text-xs text-green-400 font-bold tracking-widest uppercase mt-1">Masa Fresca Artesana &bull; Caniles (Granada)</p>
              </div>

              {/* Body Email */}
              <div className="p-8 space-y-5">
                {headline && (
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center">
                    {headline}
                  </h3>
                )}

                {flyerUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm my-4">
                    <img src={flyerUrl} alt="Flyer Promocional" className="w-full max-h-72 object-cover" />
                  </div>
                )}

                <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-xl border border-slate-100">
                  {message || 'Aquí se mostrará el cuerpo del correo redactado en el formulario...'}
                </div>

                <div className="text-center pt-4">
                  <a 
                    href={ctaUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-green-600 text-white font-black text-sm uppercase tracking-wider py-4 px-8 rounded-xl shadow-lg hover:bg-green-700 transition-all text-decoration-none"
                  >
                    {ctaText}
                  </a>
                </div>
              </div>

              {/* Footer Email */}
              <div className="bg-slate-100 p-6 text-center border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
                <p className="font-bold text-slate-700">NÉSTOR PIZZAS GOURMET S.L.</p>
                <p>Calle Alcalde Felip, 9 &bull; 18810 Caniles (Granada) &bull; Tel: +34 679 76 19 87</p>
                <p className="text-[10px] text-slate-400 pt-2">
                  Has recibido este correo porque formas parte del Club VIP de Néstor Pizzas.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
