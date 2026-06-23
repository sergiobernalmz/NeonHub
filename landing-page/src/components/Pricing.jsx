import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Star, Sparkles, Zap, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Pricing = ({ isAdmin = false }) => {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const cardsRef = useRef([]);
  const noteRef = useRef(null);

  const getCheckoutUrl = (plan) => `/checkout?plan=${plan}`;

  const plans = [
    {
      id: 'starter',
      name: 'Esencial',
      subtitle: 'Todo lo necesario para empezar a vender online sin complicaciones.',
      price: 499,
      monthly: 29,
      icon: Zap,
      featured: false,
      gradient: false,
      accentFrom: '#6366f1',
      accentTo: '#8b5cf6',
      features: [
        "Tienda online completa y funcional",
        "Tu dirección web personalizada",
        "Hosting y servidor incluidos",
        "Certificado SSL de seguridad",
        "Panel de gestión fácil de usar",
        "Soporte por email"
      ],
      cta: 'Empezar Ahora'
    },
    {
      id: 'installation',
      name: 'Profesional',
      subtitle: 'Digitalización completa y diseño personalizado por expertos.',
      price: 999,
      monthly: 49,
      icon: Star,
      featured: true,
      gradient: true,
      badge: 'MÁS POPULAR',
      accentFrom: '#7c3aed',
      accentTo: '#a78bfa',
      features: [
        "Todo lo del plan Esencial",
        "Diseño personalizado con tu marca",
        "Configuración inicial de productos",
        "Soporte prioritario por chat",
        "Backups diarios automáticos",
        "1 hora de asesoramiento incluida",
        "Actualizaciones durante 1 año"
      ],
      cta: 'Contratar Servicio'
    },
    {
      id: 'enterprise',
      name: 'Premium',
      subtitle: 'Tu socio tecnológico para proyectos de alta escala.',
      price: 1499,
      priceLabel: 'Desde',
      monthly: 79,
      icon: Sparkles,
      featured: false,
      gradient: false,
      enterprise: true,
      accentFrom: '#d97706',
      accentTo: '#f59e0b',
      features: [
        "Todo lo del plan Profesional",
        "Diseño exclusivo a medida",
        "Integraciones con tus herramientas",
        "3 horas de asesoramiento incluidas",
        "Soporte premium dedicado",
        "Actualizaciones y mejoras prioritarias",
        "Gestor de cuenta personal"
      ],
      cta: 'Solicitar Presupuesto'
    }
  ];

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Heading
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: headingRef.current, start: 'top 88%' }
      }
    );

    gsap.fromTo(subRef.current,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0, duration: 0.6, delay: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: subRef.current, start: 'top 88%' }
      }
    );

    // Cards stagger
    cardsRef.current.filter(Boolean).forEach((card, i) => {
      const isFeatured = i === 1;
      gsap.fromTo(card,
        { opacity: 0, y: 60, scale: isFeatured ? 0.92 : 0.95 },
        {
          opacity: 1, y: 0, scale: isFeatured ? 1.05 : 1,
          duration: 0.8,
          delay: i * 0.15,
          ease: 'power4.out',
          scrollTrigger: { trigger: card, start: 'top 90%' }
        }
      );

      // Hover lift
      const onEnter = () => gsap.to(card, {
        y: isFeatured ? -12 : -8,
        duration: 0.35,
        ease: 'power2.out',
      });
      const onLeave = () => gsap.to(card, {
        y: 0,
        duration: 0.35,
        ease: 'power2.out',
      });
      card.addEventListener('mouseenter', onEnter);
      card.addEventListener('mouseleave', onLeave);

      return () => {
        card.removeEventListener('mouseenter', onEnter);
        card.removeEventListener('mouseleave', onLeave);
      };
    });

    // fade de la nota
    gsap.fromTo(noteRef.current,
      { opacity: 0 },
      {
        opacity: 1, duration: 0.8,
        scrollTrigger: { trigger: noteRef.current, start: 'top 95%' }
      }
    );

    // Featured card pulsing border
    const featuredCard = cardsRef.current[1];
    if (featuredCard) {
      gsap.to(featuredCard, {
        boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 0 30px rgba(124,58,237,0.1)',
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 1.5
      });
    }

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <section id="pricing" ref={sectionRef} className="py-28 relative overflow-hidden bg-white dark:bg-[#0f0e1a]">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-violet-700/8 rounded-full blur-[160px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 mb-6 text-xs text-gray-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
            <Star className="w-3 h-3 text-amber-400" />
            Planes y Precios
          </div>

          <h2 ref={headingRef} className="text-3xl md:text-5xl font-bold mb-5 text-gray-900 dark:text-white">
            Elige tu plan,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              crece sin límites
            </span>
          </h2>

          <p ref={subRef} className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Tu tienda online profesional lista para vender. Sin sorpresas ni costes ocultos.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-end">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                ref={el => cardsRef.current[index] = el}
                className={`pricing-home-card ${plan.gradient ? 'pricing-home-card-featured' : plan.enterprise ? 'pricing-home-card-enterprise' : 'pricing-home-card-normal'} relative rounded-3xl flex flex-col overflow-hidden`}
                style={{
                  backdropFilter: 'blur(12px)',
                  padding: plan.featured ? '2.5rem 2rem' : '2rem',
                  willChange: 'transform, box-shadow'
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
                    {plan.badge}
                  </div>
                )}

                {/* Top accent line */}
                {plan.featured && (
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${plan.accentFrom}, ${plan.accentTo}, transparent)` }}
                  />
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${plan.accentFrom}22, ${plan.accentTo}22)`, border: `1px solid ${plan.accentFrom}44` }}
                    >
                      <Icon className="w-5 h-5"
                        style={{ color: plan.gradient ? '#a78bfa' : plan.enterprise ? '#fbbf24' : '#94a3b8' }}
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  </div>
                  <p className={`text-sm ${plan.gradient ? 'text-violet-700 dark:text-violet-300' : 'text-gray-500 dark:text-slate-400'}`}>{plan.subtitle}</p>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {plan.priceLabel && <span className="text-sm text-gray-400 dark:text-slate-500">{plan.priceLabel} </span>}
                  <span className="text-5xl font-black text-gray-900 dark:text-white">€{plan.price.toLocaleString()}</span>
                  <span className="text-gray-500 dark:text-slate-500 ml-1 text-sm">/instalación</span>
                </div>
                <div className="mb-8">
                  <span className="pricing-home-monthly text-sm font-medium">
                    + €{plan.monthly}/mes todo incluido
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `linear-gradient(135deg, ${plan.accentFrom}, ${plan.accentTo})` }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className={plan.gradient ? 'text-violet-800 dark:text-violet-100' : 'text-gray-700 dark:text-slate-300'}>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isAdmin ? (
                  <span className="block w-full py-4 rounded-xl font-bold text-center bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-white/10 cursor-not-allowed text-sm">
                    Solo para clientes
                  </span>
                ) : (
                  <a
                    href={getCheckoutUrl(plan.id)}
                    className={`group flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold transition-all duration-300 text-sm hover:scale-[1.02] active:scale-[0.98]${(!plan.gradient && !plan.enterprise) ? ' pricing-home-cta-normal' : ''}`}
                    style={
                      plan.gradient
                        ? { background: `linear-gradient(135deg, ${plan.accentFrom}, ${plan.accentTo})`, color: '#fff', boxShadow: `0 8px 30px ${plan.accentFrom}44` }
                        : plan.enterprise
                        ? { background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', boxShadow: '0 8px 30px rgba(217,119,6,0.3)' }
                        : null
                    }
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p ref={noteRef} className="text-center text-gray-500 dark:text-slate-600 text-sm mt-12 max-w-xl mx-auto">
          Todos los planes incluyen hosting, servidor, backups, SSL y soporte técnico. Sin sorpresas ni costes ocultos.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
