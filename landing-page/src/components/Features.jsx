import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code, Layout, Rocket, ShieldCheck, Smartphone, Zap, BarChart3, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Layout,
    title: "Diseño Premium",
    description: "Interfaces modernas y atractivas que capturan la esencia de tu marca y convierten visitas en clientes.",
    color: "violet",
    glow: "rgba(139,92,246,0.15)"
  },
  {
    icon: Smartphone,
    title: "100% Responsive",
    description: "Adaptado perfectamente a móviles, tablets y escritorio. Tu shop luce perfecta en cualquier pantalla.",
    color: "indigo",
    glow: "rgba(99,102,241,0.15)"
  },
  {
    icon: Zap,
    title: "Velocidad Extrema",
    description: "Optimizado para cargar en milisegundos con Astro y edge delivery. SEO posicionado desde el día uno.",
    color: "amber",
    glow: "rgba(245,158,11,0.12)"
  },
  {
    icon: Code,
    title: "Tecnología de Vanguardia",
    description: "Utilizamos las herramientas más modernas del mercado para garantizar que tu tienda sea rápida, segura y esté siempre disponible.",
    color: "cyan",
    glow: "rgba(6,182,212,0.12)"
  },
  {
    icon: ShieldCheck,
    title: "Seguridad Total",
    description: "Protección contra vulnerabilidades, SSL, backups diarios y gestión segura de datos de clientes.",
    color: "emerald",
    glow: "rgba(16,185,129,0.12)"
  },
  {
    icon: Rocket,
    title: "Sin Límites de Crecimiento",
    description: "Desde tu primer pedido hasta los miles de clientes diarios. Nuestra infraestructura se adapta automáticamente a tu éxito.",
    color: "fuchsia",
    glow: "rgba(217,70,239,0.12)"
  },
];

const colorMap = {
  violet: { bg: 'bg-violet-500/10', border: 'rgba(139,92,246,0.3)', text: 'text-violet-400', hover: 'rgba(139,92,246,0.2)' },
  indigo: { bg: 'bg-indigo-500/10', border: 'rgba(99,102,241,0.3)', text: 'text-indigo-400', hover: 'rgba(99,102,241,0.2)' },
  amber: { bg: 'bg-amber-500/10', border: 'rgba(245,158,11,0.3)', text: 'text-amber-400', hover: 'rgba(245,158,11,0.18)' },
  cyan: { bg: 'bg-cyan-500/10', border: 'rgba(6,182,212,0.3)', text: 'text-cyan-400', hover: 'rgba(6,182,212,0.18)' },
  emerald: { bg: 'bg-emerald-500/10', border: 'rgba(16,185,129,0.3)', text: 'text-emerald-400', hover: 'rgba(16,185,129,0.18)' },
  fuchsia: { bg: 'bg-fuchsia-500/10', border: 'rgba(217,70,239,0.3)', text: 'text-fuchsia-400', hover: 'rgba(217,70,239,0.18)' },
};

const FeatureCard = ({ feature, index }) => {
  const cardRef = useRef(null);
  const iconRef = useRef(null);
  const glowRef = useRef(null);
  const colors = colorMap[feature.color];
  const Icon = feature.icon;

  useEffect(() => {
    const card = cardRef.current;
    const icon = iconRef.current;
    const glow = glowRef.current;
    if (!card || !icon) return;

    // ScrollTrigger entrance
    const tween = gsap.fromTo(card,
      { opacity: 0, y: 50, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        delay: (index % 3) * 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none none',
        }
      }
    );

    // Mouse parallax glow
    const onMove = (e) => {
      if (!card || !glow) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gsap.to(glow, {
        x: x - rect.width / 2,
        y: y - rect.height / 2,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const onEnter = () => {
      gsap.to(card, { y: -8, scale: 1.02, duration: 0.4, ease: 'power2.out' });
      gsap.to(glow, { opacity: 1, duration: 0.3 });
      gsap.to(icon, { scale: 1.2, rotation: 5, duration: 0.3, ease: 'back.out(1.7)' });
    };

    const onLeave = () => {
      gsap.to(card, { y: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
      gsap.to(glow, { opacity: 0, duration: 0.3 });
      gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);

    return () => {
      tween.kill();
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
    };
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="relative p-8 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/8 backdrop-blur-sm overflow-hidden"
      style={{ willChange: 'transform' }}
    >
      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="absolute w-48 h-48 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${feature.glow} 0%, transparent 70%)`,
          opacity: 0,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Icon */}
      <div className={`relative z-10 w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-6`}
        style={{ border: `1px solid ${colors.border}` }}
      >
        <div ref={iconRef}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>

      <h3 className="relative z-10 text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
      <p className="relative z-10 text-gray-500 dark:text-slate-400 leading-relaxed text-sm">{feature.description}</p>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5"
        style={{ background: `radial-gradient(circle at 100% 0%, ${colors.border} 0%, transparent 70%)` }}
      />
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const dividerRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Heading
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: headingRef.current, start: 'top 90%' }
      }
    );

    // Subtitle
    gsap.fromTo(subRef.current,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: 'power3.out',
        scrollTrigger: { trigger: subRef.current, start: 'top 90%' }
      }
    );

    // Divider line
    gsap.fromTo(dividerRef.current,
      { scaleX: 0, opacity: 0 },
      {
        scaleX: 1, opacity: 1, duration: 0.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: dividerRef.current, start: 'top 90%' }
      }
    );

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-28 relative overflow-hidden bg-gray-50 dark:bg-[#0f0e1a]">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 mb-6 text-xs text-gray-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
            <Layers className="w-3 h-3" />
            Por qué NeonHub
          </div>

          <h2 ref={headingRef} className="text-3xl md:text-5xl font-bold mb-5 text-gray-900 dark:text-white">
            Más que una web,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400">
              una experiencia
            </span>
          </h2>

          <p ref={subRef} className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
            Cada detalle ha sido cuidado para ofrecer el máximo rendimiento y la mejor experiencia de usuario posible.
          </p>

          {/* Animated divider */}
          <div ref={dividerRef} className="mx-auto w-24 h-px origin-center"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent)' }}
          />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <a
            href="/register"
            className="inline-block px-9 py-4 rounded-xl font-bold text-white text-base transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 8px 30px rgba(79,70,229,0.35)' }}
          >
            Empieza gratis hoy →
          </a>
          <p className="text-sm mt-3 text-slate-500 dark:text-slate-400">7 días gratis · Sin tarjeta de crédito</p>
        </div>
      </div>
    </section>
  );
};

export default Features;
