import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useConfig } from '../context/ConfigContext'
import CSSVariables from '../components/shop/CSSVariables'
import { calcPasswordEntropy, getPasswordStrength } from '../utils/validation'
import API_BASE_URL from '../config/api'

const PasswordStrengthBar = ({ password, mutedColor }) => {
  if (!password) return null
  const entropy = calcPasswordEntropy(password)
  const s = getPasswordStrength(entropy)
  return (
    <div className="mt-1.5">
      <div style={{ background: 'rgba(128,128,128,0.2)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${s.pct}%`, background: s.color, height: '100%', borderRadius: 3, transition: 'width .2s, background .2s' }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
        <span className="text-xs" style={{ color: mutedColor }}>{entropy} bits</span>
      </div>
    </div>
  )
}

const ShopResetPassword = () => {
  const config = useConfig()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const primary = config?.colors?.primary || '#2563eb'
  const bg = config?.colors?.background || '#ffffff'
  const isDark = bg !== '#ffffff'
  const cardStyle = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const labelColor = isDark ? '#94a3b8' : '#374151'
  const inputStyle = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }
  const mutedColor = isDark ? '#64748b' : '#6b7280'
  const textColor  = isDark ? '#f1f5f9' : '#111827'

  const storeName = config?.name || 'Tienda'
  const logo = config?.logo

  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')

  const handleInputFocus = (e) => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}22` }
  const handleInputBlur  = (e) => { e.target.style.borderColor = inputStyle.borderColor; e.target.style.boxShadow = '' }

  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const canSubmit = !loading && password.length >= 8 && passwordsMatch

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      } else {
        setError(data.message || 'El enlace es inválido o ha expirado.')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4">
      <CSSVariables config={config} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={storeName} className="h-14 mx-auto mb-4 object-contain" />
          ) : (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
              style={{ backgroundColor: primary }}
            >
              <span className="text-2xl font-bold text-white">{storeName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: primary }}>{storeName}</h1>
          <p className="mt-1 text-sm" style={{ color: mutedColor }}>Nueva contraseña</p>
        </div>

        <div className="rounded-2xl p-8 border backdrop-blur-sm shadow-xl" style={cardStyle}>
          {!token ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: '#ef4444' }}>Enlace inválido o expirado.</p>
              <Link to="/forgot-password" className="text-sm font-semibold hover:opacity-80" style={{ color: primary }}>
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: primary }} />
              <p className="text-lg font-semibold mb-2" style={{ color: textColor }}>¡Contraseña actualizada!</p>
              <p className="text-sm" style={{ color: mutedColor }}>Serás redirigido al inicio de sesión en unos segundos…</p>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  {error}
                  {(error.includes('inválido') || error.includes('expirado')) && (
                    <span> <Link to="/forgot-password" className="underline" style={{ color: '#ef4444' }}>Solicitar nuevo enlace</Link></span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      style={{ ...inputStyle, transition: 'border-color .15s, box-shadow .15s' }}
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm outline-none"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                      style={{ color: mutedColor }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} mutedColor={mutedColor} />
                  {password && password.length < 8 && (
                    <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>Mínimo 8 caracteres</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirm(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      style={{
                        ...inputStyle,
                        borderColor: confirmPassword
                          ? passwordsMatch ? '#22c55e' : '#ef4444'
                          : inputStyle.borderColor,
                        transition: 'border-color .15s, box-shadow .15s'
                      }}
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm outline-none"
                      placeholder="Repite la contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                      style={{ color: mutedColor }}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>Las contraseñas no coinciden</p>
                  )}
                  {passwordsMatch && (
                    <p className="mt-1 text-xs" style={{ color: '#22c55e' }}>✓ Las contraseñas coinciden</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
                  onMouseOver={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
                  onMouseOut={e => { e.currentTarget.style.filter = '' }}
                >
                  {loading ? 'Restableciendo…' : 'Restablecer contraseña'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm" style={{ color: mutedColor }}>
                <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: primary }}>
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ShopResetPassword
