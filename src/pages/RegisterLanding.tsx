import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import { emailService } from '../lib/emailService';
import { generateSafeUUID } from '../utils/uuid';
import Footer from '../components/Footer';

declare global {
  interface Window {
    gsap?: any;
    ScrollTrigger?: any;
  }
}

// Mismo patrón de tracking de tráfico que Catalog.tsx — sesión por pestaña, nunca bloquea la UI.
const getVisitSessionId = () => {
  let id = sessionStorage.getItem('nestor_visit_session');
  if (!id) {
    id = generateSafeUUID();
    sessionStorage.setItem('nestor_visit_session', id);
  }
  return id;
};

const trackSiteEvent = async (eventType: 'page_view' | 'category_click', label?: string) => {
  try {
    await supabase.from('site_visits').insert([{
      session_id: getVisitSessionId(),
      event_type: eventType,
      label: label || null,
      device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    }]);
  } catch (e) {
    // Silencioso: el tracking nunca debe romper la experiencia
  }
};

// Scroll-reveal ligero para elementos sin animación 3D propia (usa GSAP si está disponible,
// si no cae a la clase CSS .reveal — nunca deja contenido invisible si el motor no cargó).
function useReveal<T extends HTMLElement>() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  return useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            node.classList.add('is-visible');
            observer.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);
}

interface MenuItem {
  name: string;
  price: number;
  img_url: string;
}

export default function RegisterLanding() {
  const { t } = useI18nStore() as any;
  const { openUserModal } = useAuthStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroImgRef = useRef<HTMLDivElement | null>(null);
  const heroBadgeRef = useRef<HTMLDivElement | null>(null);
  const stepCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const whyCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const vipCardRef = useRef<HTMLDivElement | null>(null);
  const tickerRowRef = useRef<HTMLDivElement | null>(null);
  const tickerSectionRef = useRef<HTMLDivElement | null>(null);

  const formRef = useReveal<HTMLDivElement>();

  useEffect(() => {
    trackSiteEvent('page_view', 'landing_registro');

    supabase
      .from('products')
      .select('name, price, img_url')
      .eq('is_active', true)
      .not('img_url', 'is', null)
      .order('price', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) setMenuItems(data as MenuItem[]);
      });
  }, []);

  // Motor de movimiento: parallax en el hero, orbes de color flotando, entradas 3D en tarjetas,
  // y el menú desplazándose en horizontal enlazado al propio scroll vertical. Progressive
  // enhancement puro — si GSAP no cargó (CDN caído, bloqueado, etc.) la página sigue 100%
  // funcional y legible, solo sin el movimiento extra.
  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger || !rootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Parallax de la foto del hero: escala y sube ligeramente al hacer scroll.
      if (heroImgRef.current) {
        gsap.to(heroImgRef.current, {
          yPercent: 12,
          scale: 1.18,
          ease: 'none',
          scrollTrigger: {
            trigger: heroImgRef.current.parentElement,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5
          }
        });
      }

      // Orbes de color flotando de forma continua (vida en el fondo, no depende del scroll).
      gsap.utils.toArray<HTMLElement>('.landing-orb').forEach((orb, i) => {
        gsap.to(orb, {
          y: i % 2 === 0 ? '+=40' : '-=40',
          x: i % 2 === 0 ? '-=20' : '+=20',
          duration: 5 + i,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });

      if (heroBadgeRef.current) {
        gsap.from(heroBadgeRef.current, { opacity: 0, y: -14, duration: 0.7, ease: 'power2.out' });
      }

      // Entradas 3D con perspectiva para las tarjetas de "Cómo funciona" y "Por qué Néstor Pizzas".
      const setup3DBatch = (cards: (HTMLDivElement | null)[]) => {
        const els = cards.filter(Boolean) as HTMLDivElement[];
        if (els.length === 0) return;
        gsap.set(els, { transformPerspective: 1000, transformOrigin: 'top center' });
        ScrollTrigger.batch(els, {
          start: 'top 85%',
          onEnter: (batch: HTMLElement[]) =>
            gsap.fromTo(
              batch,
              { opacity: 0, y: 70, rotateX: -35, scale: 0.9 },
              { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.15 }
            )
        });
      };
      setup3DBatch(stepCardsRef.current);
      setup3DBatch(whyCardsRef.current);

      if (vipCardRef.current) {
        gsap.set(vipCardRef.current, { transformPerspective: 1200, transformOrigin: 'center center' });
        gsap.fromTo(
          vipCardRef.current,
          { opacity: 0, rotateY: -18, scale: 0.9 },
          {
            opacity: 1,
            rotateY: 0,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: vipCardRef.current, start: 'top 85%' }
          }
        );
      }

      // Menú: la fila entera se desliza en horizontal enlazada al scroll vertical de la sección
      // (no es un autoplay — se mueve porque tú te mueves). Las pizzas "fluyen" con el scroll.
      if (tickerRowRef.current && tickerSectionRef.current) {
        const row = tickerRowRef.current;
        const maxShift = Math.max(0, row.scrollWidth - row.parentElement!.clientWidth) * 0.6;
        gsap.fromTo(
          row,
          { x: 40 },
          {
            x: -maxShift,
            ease: 'none',
            scrollTrigger: {
              trigger: tickerSectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6
            }
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [menuItems.length]);

  const scrollToForm = () => {
    trackSiteEvent('category_click', 'landing_cta_hero');
    document.getElementById('registro-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMenu = () => {
    document.getElementById('landing-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptLegal) {
      setError(t('landing_form_error_legal'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: name, email, phone })
          .eq('id', data.user.id);
        if (profileError) throw profileError;

        emailService.sendWelcomeEmail(email, name);
        trackSiteEvent('category_click', 'landing_registro_exito');
        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear la cuenta.');
    } finally {
      setIsLoading(false);
    }
  }, [acceptLegal, email, password, name, phone, t]);

  const heroImage = menuItems[0]?.img_url || './assets/img/products/p01_pizza_milanesa.jpeg';
  const tickerItems = menuItems.length > 0 ? [...menuItems, ...menuItems] : [];

  return (
    <div ref={rootRef} className="min-h-screen bg-nestor-base text-white relative">
      {/* Orbes de color de fondo — dan vida y color a todo el recorrido, no solo a una tarjeta */}
      <div className="landing-orb pointer-events-none absolute z-0 top-[10%] left-[-10%] w-96 h-96 rounded-full bg-nestor-green/20 blur-[100px]"></div>
      <div className="landing-orb pointer-events-none absolute z-0 top-[45%] right-[-8%] w-[28rem] h-[28rem] rounded-full bg-nestor-gold/15 blur-[110px]"></div>
      <div className="landing-orb pointer-events-none absolute z-0 top-[80%] left-[5%] w-80 h-80 rounded-full bg-nestor-red/10 blur-[100px]"></div>

      {/* Header flotante */}
      <header className="fixed top-0 inset-x-0 z-50 glass-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-black border border-nestor-green/40 overflow-hidden flex items-center justify-center shrink-0">
              <img src="./assets/brand/logo_black_exact_2k.png" alt="Néstor Pizzas" className="w-[120%] h-[120%] object-cover mix-blend-screen max-w-none" />
            </div>
            <span className="font-display font-black uppercase tracking-wider text-sm hidden sm:block">Néstor Pizzas</span>
          </div>
          <button
            onClick={scrollToForm}
            className="bg-nestor-green hover:bg-nestor-greenDark text-black font-display font-bold px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-premium hover:scale-105"
          >
            {t('landing_cta_primary')}
          </button>
        </div>
      </header>

      {/* HERO — foto grande con parallax de scroll */}
      <section className="relative z-10 min-h-[92vh] flex items-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div ref={heroImgRef} className="absolute inset-0 will-change-transform">
            <img src={heroImage} alt="Néstor Pizzas" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-nestor-base via-nestor-base/85 to-nestor-base/40"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-nestor-base/95 sm:via-nestor-base/60 to-transparent"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-24 w-full">
          <div className="max-w-xl">
            <div ref={heroBadgeRef} className="inline-flex items-center gap-2 bg-nestor-green/10 border border-nestor-green/40 rounded-full px-4 py-1.5 mb-6 animate-glow-pulse">
              <span className="w-2 h-2 rounded-full bg-nestor-green"></span>
              <span className="text-nestor-green text-xs font-bold uppercase tracking-widest">{t('landing_badge')}</span>
            </div>

            <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl uppercase leading-[1.02] tracking-tight whitespace-pre-line mb-6 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
              {t('landing_hero_title')}
            </h1>

            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              {t('landing_hero_subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                onClick={scrollToForm}
                className="bg-nestor-green hover:bg-nestor-greenDark text-black font-display font-bold px-7 py-4 rounded-2xl uppercase tracking-wider text-sm transition-all shadow-premium hover:shadow-premium-hover hover:scale-[1.03]"
              >
                {t('landing_cta_primary')}
              </button>
              <button
                onClick={scrollToMenu}
                className="bg-white/5 hover:bg-white/10 border border-white/20 text-white font-display font-bold px-7 py-4 rounded-2xl uppercase tracking-wider text-sm transition-all backdrop-blur-md"
              >
                {t('landing_cta_secondary')}
              </button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
              {[t('landing_trust_1'), t('landing_trust_2'), t('landing_trust_3')].map((txt: string, i: number) => (
                <span key={i} className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-nestor-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  {txt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-center mb-12 tracking-wide">
            {t('landing_steps_title')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-5" style={{ perspective: '1200px' }}>
            {[
              { n: '01', emoji: '📝', title: t('landing_step1_title'), desc: t('landing_step1_desc') },
              { n: '02', emoji: '🍕', title: t('landing_step2_title'), desc: t('landing_step2_desc') },
              { n: '03', emoji: '🏆', title: t('landing_step3_title'), desc: t('landing_step3_desc') },
            ].map((s, i) => (
              <div
                key={s.n}
                ref={(el) => { stepCardsRef.current[i] = el; }}
                className="card-curved p-6 sm:p-7 relative"
              >
                <span className="absolute top-4 right-5 font-display font-black text-4xl text-white/5">{s.n}</span>
                <div className="text-4xl mb-4">{s.emoji}</div>
                <h3 className="font-display font-bold text-lg uppercase tracking-wide mb-1.5">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLUB VIP */}
      <section className="px-4 sm:px-8 pb-20 relative z-10" style={{ perspective: '1400px' }}>
        <div ref={vipCardRef} className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative border border-nestor-gold/30 shadow-premium">
          <div className="absolute inset-0 bg-gradient-to-br from-nestor-card via-nestor-charcoal to-nestor-card"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-nestor-gold/10 rounded-full blur-3xl"></div>
          <div className="relative p-8 sm:p-12 text-center">
            <span className="inline-block w-12 h-12 rounded-xl bg-nestor-gold text-black font-display font-black flex items-center justify-center text-sm mb-5">VIP</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-wide mb-8">{t('landing_vip_title')}</h2>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">{t('landing_vip_rate')}</p>
                <p className="font-display font-black text-3xl text-nestor-green">{t('landing_vip_points')}</p>
              </div>
              <div className="bg-black/30 border border-nestor-gold/30 rounded-2xl p-6">
                <p className="text-nestor-gold text-xs uppercase tracking-widest mb-2 font-bold">{t('landing_vip_reward_label')}</p>
                <p className="font-display font-black text-lg sm:text-xl leading-snug">{t('landing_vip_reward')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MENÚ — la fila se desplaza en horizontal enlazada al scroll (no autoplay) */}
      {tickerItems.length > 0 && (
        <section id="landing-menu" ref={tickerSectionRef} className="py-16 relative z-10">
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-center mb-10 tracking-wide px-4">
            {t('landing_menu_title')}
          </h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-nestor-base to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-nestor-base to-transparent z-10 pointer-events-none"></div>
            <div className="overflow-hidden px-4 sm:px-8">
              <div ref={tickerRowRef} className="flex gap-6 will-change-transform">
                {tickerItems.map((item, i) => (
                  <div key={i} className="card-curved w-64 sm:w-80 shrink-0 overflow-hidden">
                    <div className="h-44 sm:h-56 overflow-hidden">
                      <img src={item.img_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-nestor-green font-display font-black text-xl">{Number(item.price).toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* POR QUÉ NÉSTOR PIZZAS */}
      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-center mb-12 tracking-wide">
            {t('landing_why_title')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-5" style={{ perspective: '1200px' }}>
            {[
              { emoji: '🔥', title: t('landing_why_1_title'), desc: t('landing_why_1_desc') },
              { emoji: '🍅', title: t('landing_why_2_title'), desc: t('landing_why_2_desc') },
              { emoji: '✋', title: t('landing_why_3_title'), desc: t('landing_why_3_desc') },
            ].map((s, i) => (
              <div
                key={i}
                ref={(el) => { whyCardsRef.current[i] = el; }}
                className="card-curved p-6 sm:p-7 text-center"
              >
                <div className="text-4xl mb-4">{s.emoji}</div>
                <h3 className="font-display font-bold text-base uppercase tracking-wide mb-1.5">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL + FORMULARIO */}
      <section id="registro-form" className="py-20 px-4 sm:px-8 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nestor-green/5 to-transparent pointer-events-none"></div>
        <div ref={formRef} className="reveal relative max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-wide mb-3">{t('landing_final_cta_title')}</h2>
            <p className="text-zinc-400 text-sm">{t('landing_final_cta_subtitle')}</p>
          </div>

          <div className="glass-floating rounded-3xl p-6 sm:p-8 shadow-premium">
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-nestor-green/10 border border-nestor-green/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-nestor-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-display font-black text-xl uppercase mb-2">{t('landing_success_title')}</h3>
                <p className="text-zinc-400 text-sm mb-6">{t('landing_success_desc')}</p>
                <a
                  href="/"
                  className="block w-full bg-nestor-green hover:bg-nestor-greenDark text-black font-display font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all text-center"
                >
                  {t('landing_success_cta')}
                </a>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-400 text-center mb-2">
                  {t('landing_form_title')}
                </h3>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('landing_form_name')}</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nestor-green transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('landing_form_phone')}</label>
                  <input
                    type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nestor-green transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('email_address')}</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nestor-green transition-colors"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('password')}</label>
                  <input
                    type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nestor-green transition-colors"
                    placeholder={t('min_6_chars')}
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox" checked={acceptLegal} onChange={(e) => setAcceptLegal(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-nestor-green shrink-0"
                  />
                  <span className="text-xs text-zinc-400 leading-relaxed">
                    {t('landing_form_legal_prefix')}
                    <button type="button" onClick={() => openUserModal('legal')} className="text-nestor-green underline underline-offset-2">
                      {t('landing_form_legal_link')}
                    </button>
                  </span>
                </label>

                {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

                <button
                  type="submit" disabled={isLoading}
                  className="w-full bg-nestor-green hover:bg-nestor-greenDark text-black font-display font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-premium disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  ) : t('landing_form_submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
