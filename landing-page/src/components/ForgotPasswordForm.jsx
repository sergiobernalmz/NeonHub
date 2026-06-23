import React, { useState } from 'react';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';

const getApiUrl = () =>
  String(import.meta.env.PUBLIC_CLIENT_API_URL || 'https://neonhub.es/api')
    .trim()
    .replace(/\/$/, '');

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Introduce un email válido.'
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError || !email) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch(`${getApiUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      if (res.ok || res.status === 404) {
        // siempre mostramos éxito para no revelar si el email existe o no
        setSubmitted(true);
      } else {
        setServerError('Error del servidor. Inténtalo de nuevo en unos minutos.');
      }
    } catch {
      setServerError('Error de conexión. Comprueba tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <p className="text-green-400 text-lg font-semibold mb-2">
          Revisa tu bandeja de entrada
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Si <span className="text-gray-900 dark:text-white font-medium">{email}</span> está registrado,
          recibirás un enlace para restablecer tu contraseña en breve.
          <br />
          <span className="text-slate-500 text-xs mt-2 block">
            Si no lo ves, comprueba la carpeta de spam.
          </span>
        </p>
        <a
          href="/login"
          className="inline-block mt-6 text-violet-400 hover:text-violet-300 text-sm underline"
        >
          Volver al inicio de sesión
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">
          Email de tu cuenta
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>
        {emailError && (
          <p className="mt-1 text-amber-400 text-xs">{emailError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !!emailError || !email}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <p className="text-center text-gray-500 dark:text-slate-500 text-sm">
        ¿Recuerdas tu contraseña?{' '}
        <a href="/login" className="text-violet-400 hover:text-violet-300">
          Iniciar sesión
        </a>
      </p>
    </form>
  );
}
