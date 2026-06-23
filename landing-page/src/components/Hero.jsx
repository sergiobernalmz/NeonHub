import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, Zap, TrendingUp, ShoppingBag, Globe } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// canvas de partículas para el fondo estrellado
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.3 + 0.05,
      drift: (Math.random() - 0.5) * 0.15,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.alpha})`;
        ctx.fill();
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5 || p.x > canvas.width + 5) p.x = Math.random() * canvas.width;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />;
};

// tarjeta de estadística pequeña para el dashboard flotante
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border backdrop-blur-sm ${color}`}>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-current/10`}>
      <Icon className="w-4 h-4" style={{ color: 'currentColor' }} />
    </div>
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-white font-bold text-sm">{value}</p>
    </div>
  </div>
);

const Hero = ({ isLoggedIn = false, dashboardUrl = '/dashboard' }) => {
  const sectionRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const mockupRef = useRef(null);
  const beamRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const statsRef = useRef([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // --- timeline de entrada principal ---
    // usamos gsap.from() — los elementos son VISIBLES por defecto en CSS,
    // GSAP anima DESDE un estado temporal hasta el estado visible original.
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. los orbes aparecen desde el centro
    tl.from([orb1Ref.current, orb2Ref.current], {
      scale: 0,
      opacity: 0,
      duration: 1.4,
      stagger: 0.2,
      ease: 'power2.out',
    }, 0);

    // 2. el badge entra deslizándose
    tl.from(badgeRef.current, { opacity: 0, y: -16, scale: 0.92, duration: 0.6 }, 0.3);

    // 3. el título sube como bloque (sin necesidad de querySelectorAll)
    tl.from(titleRef.current, { opacity: 0, y: 35, duration: 0.7 }, 0.45);

    // 4. el subtítulo
    tl.from(subtitleRef.current, { opacity: 0, y: 20, duration: 0.6 }, 0.8);

    // 5. los botones de acción
    tl.from(ctaRef.current, { opacity: 0, y: 16, duration: 0.5 }, 1.0);

    // 6. el mockup sube desde abajo
    tl.from(mockupRef.current, {
      opacity: 0, y: 70, scale: 0.95, duration: 1.0, ease: 'power4.out'
    }, 1.1);

    // 7. las tarjetas de stats aparecen escalonadas
    tl.from(statsRef.current.filter(Boolean), { opacity: 0, x: -18, duration: 0.4, stagger: 0.1 }, 1.5);

    // --- bucle del rayo de escaneo ---
    if (beamRef.current) {
      gsap.fromTo(beamRef.current,
        { top: '0%', opacity: 0.7 },
        {
          top: '100%',
          opacity: 0,
          duration: 2.5,
          ease: 'none',
          repeat: -1,
          repeatDelay: 4,
          delay: 2
        }
      );
    }

    // --- movimiento suave de balanceo del mockup ---
    gsap.to(mockupRef.current, {
      y: -12,
      duration: 3.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 2.5
    });

    // --- los orbes se mueven lentamente ---
    gsap.to(orb1Ref.current, {
      x: 30, y: -20,
      duration: 6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
    gsap.to(orb2Ref.current, {
      x: -25, y: 20,
      duration: 7,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 1
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const titleWords = ['Transforma', 'tu'];
  const titleGlowWords = ['Visión', 'en', 'Realidad'];

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-white dark:bg-slate-950">

      {/* patrón de cuadrícula */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />

      {/* campo de partículas/estrellas */}
      <div className="absolute inset-0">
        <ParticleCanvas />
      </div>

      {/* orbes brillantes de fondo */}
      <div ref={orb1Ref} className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/25 rounded-full blur-[140px]" />
      <div ref={orb2Ref} className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px]" />

      {/* contenido principal */}
      <div className="relative max-w-7xl mx-auto px-6 flex flex-col items-center text-center z-10">

        {/* etiqueta destacada */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 backdrop-blur-sm mb-8">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-200">La nueva era del comercio digital</span>
        </div>

        {/* título con palabras en perspectiva 3D */}
        <h1 ref={titleRef} className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
          {titleWords.map((w, i) => (
            <span key={i} className="word inline-block mr-4 text-gray-900 dark:text-white">{w}{' '}</span>
          ))}
          <br />
          {titleGlowWords.map((w, i) => (
            <span key={i} className="word inline-block mr-4 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 text-glow">{w}{' '}</span>
          ))}
        </h1>

        {/* subtítulo */}
        <p ref={subtitleRef} className="text-lg md:text-xl text-gray-500 dark:text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Tu tienda online profesional, lista para vender hoy mismo. Nos encargamos de toda la tecnología para que tú solo te preocupes de tus clientes.
        </p>

        {/* botones de acción */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href={isLoggedIn ? dashboardUrl : '/register'}
            className="group px-8 py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-violet-800 dark:hover:bg-violet-100 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(167,139,250,0.6)] hover:shadow-[0_0_60px_-10px_rgba(167,139,250,0.9)] hover:scale-105 active:scale-95"
          >
            {isLoggedIn ? 'Ir a mi dashboard' : 'Crear mi tienda gratis'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
          <a
            href="https://demo.neonhub.es"
            className="px-8 py-4 bg-gray-100 text-gray-800 border border-gray-300 dark:bg-white/5 dark:text-white dark:border-white/15 rounded-full font-bold text-lg hover:bg-gray-200 dark:hover:bg-white/10 dark:hover:border-white/30 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-sm"
          >
            Ver demo en vivo →
          </a>
        </div>
        {!isLoggedIn && (
          <p className="text-sm mt-4 text-slate-500 dark:text-slate-400">
            ✓ 7 días gratis &nbsp;·&nbsp; ✓ Sin tarjeta &nbsp;·&nbsp; ✓ Cancela cuando quieras
          </p>
        )}

        {/* mockup del dashboard flotante */}
        <div ref={mockupRef} className="mt-20 relative w-full max-w-5xl" style={{ perspective: '1200px' }}>

          {/* tarjetas de estadísticas flotantes */}
          <div
            ref={el => statsRef.current[0] = el}
            className="absolute -left-4 top-1/4 z-20 hidden lg:block"
          >
            <StatCard icon={TrendingUp} label="Ventas hoy" value="+€2,840" color="border-emerald-500/30 text-emerald-400" />
          </div>
          <div
            ref={el => statsRef.current[1] = el}
            className="absolute -right-4 top-1/3 z-20 hidden lg:block"
          >
            <StatCard icon={ShoppingBag} label="Pedidos" value="124 activos" color="border-violet-500/30 text-violet-400" />
          </div>
          <div
            ref={el => statsRef.current[2] = el}
            className="absolute -left-2 bottom-1/4 z-20 hidden lg:block"
          >
            <StatCard icon={Globe} label="Visitantes" value="8.2K/día" color="border-indigo-500/30 text-indigo-400" />
          </div>

          {/* marco principal del mockup */}
          <div className="relative bg-slate-900 rounded-2xl border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden aspect-[16/9]">

            {/* rayo de escaneo */}
            <div ref={beamRef} className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent pointer-events-none z-30" style={{ top: '0%' }} />

            {/* barra superior estilo navegador */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800/80 flex items-center px-3 gap-1.5 border-b border-white/5 z-20">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 h-4 rounded bg-slate-700/60 flex items-center px-2">
                <span className="text-[9px] text-slate-500 font-mono">neonhub.es/dashboard</span>
              </div>
            </div>

            {/* contenido de la UI del dashboard */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pt-8">
              <div className="p-5 grid grid-cols-12 gap-4 h-full">
                {/* barra lateral */}
                <div className="col-span-2 flex flex-col gap-3">
                  <div className="h-6 w-3/4 bg-violet-500/20 rounded-md" />
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-5 rounded-md ${i===1 ? 'bg-violet-500/30 w-full' : 'bg-white/5 w-4/5'}`} />
                  ))}
                </div>
                {/* área principal */}
                <div className="col-span-10 flex flex-col gap-4">
                  {/* fila de cabecera */}
                  <div className="flex gap-4">
                    {['bg-emerald-500/20','bg-violet-500/20','bg-indigo-500/20','bg-amber-500/20'].map((c, i) => (
                      <div key={i} className={`flex-1 ${c} rounded-xl h-16 border border-white/5`} />
                    ))}
                  </div>
                  {/* gráfico y tabla */}
                  <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                    <div className="col-span-2 bg-white/[0.03] rounded-xl border border-white/5 flex items-end p-4 gap-2 overflow-hidden">
                      {[60,80,45,90,70,85,55,95,75,88,62,78].map((h, i) => (
                        <div key={i}
                          className="flex-1 rounded-sm bg-gradient-to-t from-violet-500/60 to-violet-400/20"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 flex flex-col gap-2 overflow-hidden">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex gap-2 items-center">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-white/5 rounded-full"
                            style={{ width: `${Math.random()*40+50}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* degradado inferior */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent z-10" />
          </div>

          {/* brillo debajo del mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-violet-600/20 blur-3xl rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
