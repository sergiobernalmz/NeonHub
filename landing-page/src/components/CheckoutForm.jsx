import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Mail, User, Globe, Loader2, Lock, MessageSquare, AlertTriangle, Check, X } from 'lucide-react';
import { calcPasswordEntropy, getPasswordStrength, validateEmail, validatePassword, getPasswordError, validateSubdomain } from '../utils/validation.js';

// ── componentes compartidos ──────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const entropy = calcPasswordEntropy(password);
  const s = getPasswordStrength(entropy);
  const width = Math.min((entropy / 128) * 100, 100);
  return (
    <div className="mt-2">
      <div style={{ background: '#1e293b', borderRadius: 3, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, background: s.color, height: '100%', borderRadius: 3, transition: 'width .2s, background .2s' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
        <span className="text-xs text-slate-500">{entropy} bits</span>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

// ──────────────────────────────────────────────────────────────────────────────

const CheckoutForm = ({ planName, planId, price, monthly = 0, initialUser = null, emailVerified = true }) => {
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    ownerFirstName: initialUser?.username ? initialUser.username.split('_')[0] : '',
    ownerLastName: '',
    ownerEmail: initialUser?.email || '',
    ownerPassword: '',
    confirmPassword: '',
    customizationNotes: '',
    customizeLater: false
  });
  const [touched, setTouched] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState('idle'); // idle | checking | available | taken | invalid (estados posibles)
  const debounceRef = useRef(null);

  const isEnterprise = planId === 'enterprise';

  const normalizedSubdomain = useMemo(
    () => formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    [formData.subdomain]
  );

  const getApiBaseUrl = () => {
    const envValue = String(import.meta.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
    if (typeof window === 'undefined') return envValue || 'https://neonhub.es/api';
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:4000/api';
    if (envValue) {
      if (envValue.startsWith('/')) return `${origin}${envValue}`;
      if (envValue.includes('localhost') || envValue.includes('127.0.0.1')) return `${origin}/api`;
      return envValue;
    }
    return `${origin}/api`;
  };

  // ── comprobación de disponibilidad del subdominio ───────────────────────────────────────────
  const checkSubdomain = useCallback(async (sub) => {
    if (!sub || !validateSubdomain(sub)) {
      setSubdomainStatus(sub ? 'invalid' : 'idle');
      return;
    }
    setSubdomainStatus('checking');
    try {
      const res = await fetch(`${getApiBaseUrl()}/billing/check-subdomain?sub=${encodeURIComponent(sub)}`);
      const data = await res.json();
      setSubdomainStatus(data.available ? 'available' : 'taken');
    } catch {
      setSubdomainStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkSubdomain(normalizedSubdomain), 500);
    return () => clearTimeout(debounceRef.current);
  }, [normalizedSubdomain, checkSubdomain]);

  // ── validación del formulario ─────────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e = {};
    if (!formData.tenantName.trim() || formData.tenantName.trim().length < 3) {
      e.tenantName = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.tenantName.trim().length > 50) {
      e.tenantName = 'El nombre no puede superar 50 caracteres';
    }

    if (!normalizedSubdomain) {
      e.subdomain = 'Elige una dirección para tu tienda';
    } else if (!validateSubdomain(normalizedSubdomain)) {
      e.subdomain = 'Solo letras minúsculas, números y guiones (sin empezar/terminar con guión)';
    } else if (subdomainStatus === 'taken') {
      e.subdomain = 'Este subdominio ya está en uso';
    }

    if (!formData.ownerFirstName.trim()) e.ownerFirstName = 'Introduce tu nombre';
    if (!formData.ownerLastName.trim()) {
      e.ownerLastName = 'Introduce tus apellidos';
    } else if (formData.ownerLastName.includes('@')) {
      e.ownerLastName = 'El apellido no puede ser un email';
    }

    if (!initialUser) {
      if (!formData.ownerEmail || !validateEmail(formData.ownerEmail)) {
        e.ownerEmail = 'Introduce un email válido';
      }
    }

    if (!formData.ownerPassword) {
      e.ownerPassword = 'La contraseña es obligatoria';
    } else {
      const pwdErr = getPasswordError(formData.ownerPassword);
      if (pwdErr) e.ownerPassword = pwdErr;
    }

    if (!initialUser) {
      if (!formData.confirmPassword) {
        e.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.ownerPassword !== formData.confirmPassword) {
        e.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    if (isEnterprise && !formData.customizeLater && !formData.customizationNotes.trim()) {
      e.customizationNotes = 'Describe qué necesitas o marca "Personalizar más tarde"';
    }
    return e;
  }, [formData, normalizedSubdomain, subdomainStatus, initialUser, isEnterprise]);

  const isFormValid = Object.keys(errors).length === 0 && subdomainStatus !== 'checking';

  const touch = (field) => setTouched(prev => ({ ...prev, [field]: true }));
  const touchAll = () => {
    const all = {};
    Object.keys(formData).forEach(k => { all[k] = true; });
    setTouched(all);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    touch(name);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'subdomain' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value)
    }));
  };

  const fieldBorder = (field) => {
    if (!touched[field]) return 'border-gray-200 dark:border-slate-700';
    return errors[field] ? 'border-red-400 dark:border-red-500' : 'border-green-400 dark:border-green-600';
  };

  // ── envío del formulario ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    touchAll();
    setError('');

    if (!isFormValid) return;

    setIsProcessing(true);
    try {
      const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&subdomain=${encodeURIComponent(normalizedSubdomain)}`;
      const cancelUrl = `${window.location.origin}/checkout?plan=${encodeURIComponent(planId)}`;

      const response = await fetch(`${getApiBaseUrl()}/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          tenantName: formData.tenantName.trim(),
          subdomain: normalizedSubdomain,
          ownerEmail: initialUser ? initialUser.email : formData.ownerEmail.trim().toLowerCase(),
          ownerPassword: formData.ownerPassword,
          ownerFirstName: formData.ownerFirstName.trim(),
          ownerLastName: formData.ownerLastName.trim(),
          customizationNotes: isEnterprise
            ? (formData.customizeLater ? 'PERSONALIZAR_MAS_TARDE' : formData.customizationNotes.trim())
            : '',
          successUrl,
          cancelUrl
        })
      });

      const rawBody = await response.text();
      let result = null;
      try { result = rawBody ? JSON.parse(rawBody) : null; } catch { result = null; }

      if (!response.ok || !result?.success || !result?.data?.url) {
        if (response.status === 403 && result?.error === 'email_not_verified') {
          const returnUrl = encodeURIComponent(`/checkout?plan=${encodeURIComponent(planId)}`);
          throw new Error(`__auth_required__:${returnUrl}`);
        }
        throw new Error(result?.error || result?.message || 'No se pudo crear la sesión de pago.');
      }

      window.location.href = result.data.url;
    } catch (submitError) {
      setError(submitError.message || 'Error inesperado al iniciar el pago.');
      setIsProcessing(false);
    }
  };

  // ── indicador de estado del subdominio ─────────────────────────────────────────────
  const SubdomainIndicator = () => {
    if (!normalizedSubdomain) return null;
    if (subdomainStatus === 'checking') return <span className="text-xs text-slate-400">Comprobando disponibilidad…</span>;
    if (subdomainStatus === 'available') return <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Disponible</span>;
    if (subdomainStatus === 'taken')     return <span className="text-xs text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> No disponible</span>;
    if (subdomainStatus === 'invalid')   return null;
    return <span className="text-xs text-violet-400">Tu tienda: <strong>{normalizedSubdomain}.neonhub.es</strong></span>;
  };

  const confirmOk = formData.confirmPassword && formData.ownerPassword === formData.confirmPassword;

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Completa tu pedido</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          Plan: <span className={`font-semibold ${isEnterprise ? 'text-amber-400' : 'text-violet-400'}`}>{planName}</span>
          {' · '}Precio: <span className="text-white font-semibold">€{price.toLocaleString()}</span>
          {monthly > 0 && <span className="text-slate-500"> + €{monthly}/mes</span>}
        </p>

        {initialUser && !emailVerified && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Verifica tu email para continuar</p>
                <p className="text-amber-300/80">
                  Te hemos enviado un correo a <span className="font-semibold text-amber-200">{initialUser.email}</span>.
                  Haz clic en el enlace para verificar tu cuenta.
                </p>
                <button type="button" disabled={resendStatus === 'sending'}
                  onClick={async () => {
                    setResendStatus('sending');
                    try {
                      const res = await fetch(`${getApiBaseUrl()}/auth/resend-verification`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: initialUser.email })
                      });
                      setResendStatus(res.ok ? 'sent' : 'error');
                    } catch { setResendStatus('error'); }
                  }}
                  className="mt-3 text-xs text-amber-400 underline hover:text-amber-300 disabled:opacity-50">
                  {resendStatus === 'sending' ? 'Enviando…' : resendStatus === 'sent' ? '✓ Correo enviado' :
                   resendStatus === 'error' ? 'Error al enviar' : 'Reenviar correo de verificación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && error.startsWith('__auth_required__:') ? (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm">
            <p className="font-semibold mb-3">Para completar tu compra necesitas registrarte y verificar tu email primero.</p>
            <div className="flex gap-3">
              <a href={`/register?redirect=${error.split(':')[1]}`} className="flex-1 text-center py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors">Crear cuenta</a>
              <a href={`/login?redirect=${error.split(':')[1]}`} className="flex-1 text-center py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors">Iniciar sesión</a>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Nombre de negocio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Nombre de tu negocio</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
              <input type="text" name="tenantName" value={formData.tenantName} onChange={handleInputChange} onBlur={() => touch('tenantName')} required placeholder="Ej: Moda Express…"
                className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('tenantName')}`} />
            </div>
            {touched.tenantName && <FieldError msg={errors.tenantName} />}
          </div>

          {/* Subdominio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Dirección de tu tienda</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
              <input type="text" name="subdomain" value={formData.subdomain} onChange={handleInputChange} onBlur={() => touch('subdomain')} required placeholder="mitienda"
                className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('subdomain')}`} />
            </div>
            <div className="mt-1.5"><SubdomainIndicator /></div>
            {touched.subdomain && <FieldError msg={errors.subdomain} />}
          </div>

          {/* Nombre / Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tu nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                <input type="text" name="ownerFirstName" value={formData.ownerFirstName} onChange={handleInputChange} onBlur={() => touch('ownerFirstName')} required placeholder="Sergio"
                  className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('ownerFirstName')}`} />
              </div>
              {touched.ownerFirstName && <FieldError msg={errors.ownerFirstName} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tus apellidos</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                <input type="text" name="ownerLastName" value={formData.ownerLastName} onChange={handleInputChange} onBlur={() => touch('ownerLastName')} required placeholder="García"
                  className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('ownerLastName')}`} />
              </div>
              {touched.ownerLastName && <FieldError msg={errors.ownerLastName} />}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tu email (para acceder a tu tienda)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
              <input type="email" name="ownerEmail" value={formData.ownerEmail} onChange={handleInputChange} onBlur={() => touch('ownerEmail')} required disabled={!!initialUser} placeholder="ceo@empresa.com"
                className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors ${initialUser ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-slate-700' : fieldBorder('ownerEmail')}`} />
            </div>
            {!initialUser && touched.ownerEmail && <FieldError msg={errors.ownerEmail} />}
          </div>

          {/* contraseña — siempre obligatoria; confirmación solo si no está logueado */}
          {initialUser ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Contraseña del panel de administración <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                <input type="password" name="ownerPassword" value={formData.ownerPassword} onChange={handleInputChange} onBlur={() => touch('ownerPassword')} required placeholder="Mínimo 8 caracteres"
                  className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('ownerPassword')}`} />
              </div>
              <PasswordStrengthBar password={formData.ownerPassword} />
              <p className="mt-1 text-xs text-slate-500">Esta será tu contraseña para entrar en el panel y en la app.</p>
              {touched.ownerPassword && <FieldError msg={errors.ownerPassword} />}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Contraseña para tu tienda</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                  <input type="password" name="ownerPassword" value={formData.ownerPassword} onChange={handleInputChange} onBlur={() => touch('ownerPassword')} required placeholder="••••••••"
                    className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('ownerPassword')}`} />
                </div>
                <PasswordStrengthBar password={formData.ownerPassword} />
                {touched.ownerPassword && <FieldError msg={errors.ownerPassword} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} onBlur={() => touch('confirmPassword')} required placeholder="••••••••"
                    className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors ${fieldBorder('confirmPassword')}`} />
                </div>
                {touched.confirmPassword && <FieldError msg={errors.confirmPassword} />}
                {confirmOk && <p className="mt-1 text-xs text-green-400">✓ Las contraseñas coinciden</p>}
              </div>
            </div>
          )}

          {/* opciones del plan Enterprise */}
          {isEnterprise && (
            <div className="border border-amber-500/20 rounded-xl p-5 bg-amber-500/5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                Personalización a medida
              </h3>
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" name="customizeLater" checked={formData.customizeLater} onChange={handleInputChange}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/50" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Prefiero definirlo más tarde</span>
                </label>
              </div>
              {!formData.customizeLater && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Cuéntanos qué necesitas</label>
                  <textarea name="customizationNotes" value={formData.customizationNotes} onChange={handleInputChange} onBlur={() => touch('customizationNotes')} rows={4}
                    placeholder="Ej: colores de mi marca, conexión con facturación…"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none text-sm" />
                  {touched.customizationNotes && <FieldError msg={errors.customizationNotes} />}
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing || (initialUser != null && !emailVerified)}
            className={`w-full font-bold py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${isEnterprise
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30'
              : 'text-white shadow-lg shadow-violet-500/30'}`}
            style={!isEnterprise ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' } : {}}>
            {isProcessing ? (<><Loader2 className="w-5 h-5 animate-spin" />Redirigiendo a pago seguro...</>) : `Continuar al pago (€${price.toLocaleString()})`}
          </button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Qué pasa después del pago</h3>
        <ul className="space-y-3 text-gray-600 dark:text-slate-300 text-sm">
          {['Procesamos tu pago de forma segura con Stripe.', 'Creamos tu tienda online automáticamente.', 'Configuramos tu dirección web y seguridad.', 'Podrás acceder a tu tienda con el email y contraseña elegidos.'].map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-violet-400 font-bold mt-0.5">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
          {isEnterprise && (
            <li className="flex items-start gap-3">
              <span className="text-amber-400 font-bold mt-0.5">5.</span>
              <span>Te contactamos para definir las personalizaciones de tu tienda.</span>
            </li>
          )}
        </ul>
        {monthly > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h4 className="text-white font-medium mb-2 text-sm">Cuota mensual: €{monthly}/mes</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              {['Hosting y servidor incluidos', 'Copias de seguridad diarias', 'Certificado de seguridad SSL', 'Soporte técnico y actualizaciones', 'Sin permanencia, cancela cuando quieras'].map(t => <li key={t}>• {t}</li>)}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CheckoutForm;
