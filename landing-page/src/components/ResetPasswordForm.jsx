import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { calcPasswordEntropy, getPasswordStrength, validatePassword } from '../utils/validation.js';

const getApiUrl = () =>
  String(import.meta.env.PUBLIC_CLIENT_API_URL || 'https://neonhub.es/api')
    .trim()
    .replace(/\/$/, '');

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

export default function ResetPasswordForm({ token, source, subdomain }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg font-semibold mb-4">Enlace inválido o expirado.</p>
        <a href="/auth/forgot-password" className="inline-block mt-2 text-violet-400 hover:text-violet-300 underline text-sm">
          Solicitar un nuevo enlace de recuperación
        </a>
      </div>
    );
  }

  if (success) {
    if (source === 'change') {
      return (
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-green-400 text-lg font-semibold mb-2">¡Contraseña actualizada correctamente!</p>
          <p className="text-slate-400 text-sm mb-4">
            Puedes cerrar esta ventana y volver a tu panel.
          </p>
          {subdomain && (
            <a
              href={`https://${subdomain}.neonhub.es/login`}
              className="inline-block mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Volver al panel
            </a>
          )}
        </div>
      );
    }
    return (
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <p className="text-green-400 text-lg font-semibold mb-2">¡Contraseña actualizada correctamente!</p>
        <p className="text-slate-400 text-sm">Serás redirigido al inicio de sesión en unos segundos…</p>
      </div>
    );
  }

  const passError = password && !validatePassword(password)
    ? (password.length < 8 ? 'Mínimo 8 caracteres' : 'La contraseña es demasiado débil')
    : '';
  const confirmError = confirm && password !== confirm ? 'Las contraseñas no coinciden' : '';
  const confirmOk = confirm && password === confirm && password.length > 0;
  const canSubmit = !loading && validatePassword(password) && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = source === 'change'
        ? `${getApiUrl()}/auth/complete-password-change`
        : `${getApiUrl()}/auth/reset-password`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        if (source !== 'change') {
          setTimeout(() => { window.location.href = '/login'; }, 3000);
        }
      } else {
        setError(data.message || 'No se pudo restablecer la contraseña.');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
          {(error.includes('inválido') || error.includes('caducado')) && (
            <span> <a href="/auth/forgot-password" className="underline hover:text-red-300">Solicitar nuevo enlace</a></span>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ borderColor: passError ? '#ef4444' : (password && !passError ? '#22c55e' : '') }}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white pr-11 focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="Mínimo 8 caracteres"
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors" tabIndex={-1}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <PasswordStrengthBar password={password} />
        {passError && <p className="mt-1 text-xs text-red-400">{passError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar contraseña</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ borderColor: confirmError ? '#ef4444' : (confirmOk ? '#22c55e' : '') }}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white pr-11 focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="Repite la nueva contraseña"
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors" tabIndex={-1}>
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {confirmError && <p className="mt-1 text-xs text-red-400">{confirmError}</p>}
        {confirmOk && <p className="mt-1 text-xs text-green-400">✓ Las contraseñas coinciden</p>}
      </div>

      <button type="submit" disabled={!canSubmit}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Restableciendo…' : 'Restablecer contraseña'}
      </button>
    </form>
  );
}
