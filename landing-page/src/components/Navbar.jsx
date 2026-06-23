import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Menu, X, ChevronRight } from 'lucide-react';

const Navbar = ({ user }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (localStorage.getItem('landingTheme') || 'dark') === 'dark';
  });
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('landingTheme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const navRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef([]);
  const themeRef = useRef(null);
  const ctaRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // animación de entrada
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const allTargets = [navRef.current, logoRef.current, ...linksRef.current.filter(Boolean), themeRef.current, ctaRef.current].filter(Boolean);
    const animTargets = [...linksRef.current.filter(Boolean), themeRef.current].filter(Boolean);

    // fijamos el estado inicial antes del timeline para evitar race conditions con gsap.from()
    // donde el ciclo de vida de React puede matar el tween antes de que los refs sean válidos
    gsap.set(navRef.current, { y: -60 });
    gsap.set(logoRef.current, { x: -15 });
    gsap.set(animTargets, { y: -8, opacity: 0 });
    if (ctaRef.current) gsap.set(ctaRef.current, { scale: 0.92, opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => gsap.set(allTargets, { clearProps: 'all' }),
    });
    tl.to(navRef.current, { y: 0, duration: 0.7 });
    tl.to(logoRef.current, { x: 0, duration: 0.45 }, '-=0.4');
    tl.to(animTargets, { y: 0, opacity: 1, duration: 0.35, stagger: 0.06 }, '-=0.3');
    if (ctaRef.current) {
      tl.to(ctaRef.current, { scale: 1, opacity: 1, duration: 0.35 }, '-=0.2');
    }

    return () => {
      tl.kill();
      // limpiamos los estilos por ref si el componente sigue montado
      if (navRef.current) gsap.set(navRef.current, { clearProps: 'all' });
      // limpiamos los estilos inline por DOM por si los refs ya no están disponibles
      document.querySelectorAll('[data-nav-item]').forEach(el => {
        el.style.transform = '';
        el.style.opacity = '';
      });
    };
  }, []);

  // efecto al hacer scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // animación del menú móvil
  useEffect(() => {
    const menu = mobileMenuRef.current;
    if (!menu) return;
    if (mobileMenuOpen) {
      gsap.fromTo(menu,
        { opacity: 0, height: 0, y: -10 },
        { opacity: 1, height: 'auto', y: 0, duration: 0.35, ease: 'power3.out' }
      );
    } else {
      gsap.to(menu,
        { opacity: 0, height: 0, duration: 0.25, ease: 'power2.in' }
      );
    }
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Servicio', href: '/servicio' },
    { label: 'Precios',  href: '/precios' },
    { label: 'Contacto', href: '/contacto' },
  ];

  return (
    <nav
      ref={navRef}
      data-nav-item
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl border-b border-black/8 dark:border-white/8 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* logo */}
        <a ref={logoRef} data-nav-item href="/" className="text-xl font-black tracking-tighter text-gray-900 dark:text-white flex items-center gap-2 group" aria-label="NeonHub">
          <img aria-hidden="true" src="/neonhub.png" alt="" className="w-8 h-8 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          />
          <span aria-hidden="true" className="group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors duration-300">NeonHub</span>
        </a>

        {/* enlaces de escritorio */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              ref={el => linksRef.current[i] = el}
              data-nav-item
              href={link.href}
              className="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-violet-500 dark:bg-violet-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}

          <button
            ref={themeRef}
            data-nav-item
            onClick={() => setIsDark(d => !d)}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            style={{ fontSize: '16px', lineHeight: 1 }}
          >
            <span style={{ fontSize: '13px' }}>
              {isDark ? 'Modo claro' : 'Modo oscuro'}
            </span>
          </button>

          {user ? (
            <div className="flex items-center gap-4" ref={el => linksRef.current[navLinks.length] = el} data-nav-item>
              <a
                href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {user.role === 'admin' ? 'Panel Admin' : 'Dashboard'}
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                  } catch (e) {}
                  window.location.href = '/login';
                }}
                className="text-sm font-medium text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4" ref={ctaRef} data-nav-item>
              <a href="/login" className="text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Iniciar Sesión
              </a>
              <a
                href="/register"
                className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-all duration-300 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}
              >
                Registrarse
              </a>
            </div>
          )}
        </div>

        {/* botón para abrir/cerrar el menú móvil */}
        <button
          className="md:hidden text-gray-900 dark:text-white p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* menú móvil */}
      <div
        ref={mobileMenuRef}
        className="md:hidden overflow-hidden border-t border-black/8 dark:border-white/8 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
        style={{ height: 0, opacity: 0 }}
      >
        <div className="px-6 py-8 flex flex-col gap-5">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center justify-between text-lg font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
              <ChevronRight className="w-4 h-4 opacity-40" />
            </a>
          ))}
          <div className="border-t border-black/8 dark:border-white/8 pt-5 flex flex-col gap-3">
            {user ? (
              <a href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="w-full py-3 rounded-xl text-center font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                {user.role === 'admin' ? 'Ir al Panel Admin' : 'Ir al Dashboard'}
              </a>
            ) : (
              <>
                <a href="/login"
                  className="w-full py-3 rounded-xl text-center font-semibold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Iniciar Sesión
                </a>
                <a href="/register"
                  className="w-full py-3 rounded-xl text-center font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  Registrarse
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
