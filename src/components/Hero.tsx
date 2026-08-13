import { useState } from 'react';

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(1);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-nestor-card border border-green-500/30 min-h-[600px] sm:min-h-[420px] flex items-center group">
        
        {/* Slide 1 */}
        <div className={`absolute inset-0 flex flex-col sm:flex-row items-center justify-between p-6 sm:p-14 z-10 transition-all duration-700 ${activeSlide === 1 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/40 via-nestor-obsidian to-nestor-obsidian`}>
          <div className="relative z-10 w-full sm:w-[55%] space-y-4 sm:space-y-6 text-center sm:text-left pb-16 sm:pb-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] sm:text-sm font-display font-bold uppercase tracking-widest border border-green-500/40 shadow">
              <span className="animate-pulse">🔥 PROMOCIÓN EXCLUSIVA CANILES</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none uppercase drop-shadow-lg">
              JUEVES LOCOS:<br/><span className="text-nestor-gold drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">2 PIZZAS X 11,00 €</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-300 font-normal leading-relaxed max-w-xl mx-auto sm:mx-0">
              Cada jueves disfruta de dos pizzas de 33cm recién horneadas con hasta 3 ingredientes artesanos al mejor precio de la comarca.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 relative z-30">
              <button className="w-full sm:w-auto bg-nestor-green hover:bg-green-500 text-white font-display font-black px-8 py-4 rounded-2xl text-sm sm:text-sm shadow-[0_15px_30px_-5px_rgba(34,197,94,0.4)] tracking-wider uppercase transition-all hover:scale-105 border border-green-400/50">
                Explorar Carta de Pizzas →
              </button>
            </div>
          </div>
          <div className="relative z-10 w-40 h-40 sm:w-2/5 sm:h-full mt-2 sm:mt-0 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-green-500/20 blur-[100px] rounded-full"></div>
            <img src="./assets/img/products/jueves_locos_2_pizzas.png" alt="Pizza" className="w-full h-full object-cover rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-green-500/30 transform sm:scale-110 group-hover:rotate-3 transition-transform duration-700" />
          </div>
        </div>

        {/* Slide 2 */}
        <div className={`absolute inset-0 flex flex-col sm:flex-row items-center justify-between p-6 sm:p-14 transition-all duration-700 ${activeSlide === 2 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'} bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-red-900/40 via-nestor-obsidian to-nestor-obsidian`}>
          <div className="relative z-10 w-full sm:w-[55%] space-y-4 sm:space-y-6 text-center sm:text-left pb-16 sm:pb-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] sm:text-sm font-display font-bold uppercase tracking-widest border border-red-500/40 shadow">
              <span className="animate-pulse">🎁 PROGRAMA DE REFERIDOS NÉSTOR</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none uppercase drop-shadow-lg">
              GANA UNA PIZZA:<br/><span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">¡COMPLETAMENTE GRATIS!</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-300 font-normal leading-relaxed max-w-xl mx-auto sm:mx-0">
              ¡Regístrate ahora! Comparte tu código con 5 amigos y en tu próximo pedido superior a 15€, te regalamos una Pizza Familiar.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 relative z-30">
              <button className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-display font-black px-8 py-4 rounded-2xl text-sm sm:text-sm shadow-[0_15px_30px_-5px_rgba(220,38,38,0.4)] tracking-wider uppercase transition-all hover:scale-105 border border-red-400/50">
                Regístrate y Gana →
              </button>
            </div>
          </div>
          <div className="relative z-10 w-40 h-40 sm:w-2/5 sm:h-full mt-2 sm:mt-0 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full"></div>
            <img src="./assets/img/products/p28_mazzi_1ing.jpeg" alt="Pizza Gratis" className="w-full h-full object-cover rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-red-500/30 transform sm:scale-110 group-hover:-rotate-3 transition-transform duration-700" />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 right-4 sm:bottom-4 sm:right-14 z-20 flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <button onClick={() => setActiveSlide(1)} className={`w-8 h-2 rounded-full transition-all ${activeSlide === 1 ? 'bg-nestor-green shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-600 hover:bg-zinc-400 w-2.5'}`}></button>
          <button onClick={() => setActiveSlide(2)} className={`w-8 h-2 rounded-full transition-all ${activeSlide === 2 ? 'bg-nestor-green shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-600 hover:bg-zinc-400 w-2.5'}`}></button>
        </div>
      </div>
    </section>
  );
}
