import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useConfig } from '../context/ConfigContext'
import CSSVariables from '../components/shop/CSSVariables'
import axios from 'axios'

const calcStrength = (pw) => {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const strengthLabel = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte']
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

const Activate = () => {
  const config   = useConfig()
  const navigate = useNavigate()

  const [token,           setToken]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [fieldErrors,     setFieldErrors]     = useState({})
  const [success,         setSuccess]         = useState(false)
  const [tokenInvalid,    setTokenInvalid]    = useState(false)

  const primary    = config?.colors?.primary || '#7c3aed'
  const bg         = config?.colors?.background || '#0f172a'
  const isDark     = bg !== '#ffffff'
  const storeName  = config?.name || 'NeonHub'
  const logo       = config?.logo

  const cardStyle  = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const labelColor = isDark ? '#94a3b8' : '#374151'
  const inputStyle = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }
  const mutedColor = isDark ? '#64748b' : '#6b7280'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) {
      setTokenInvalid(true)
    } else {
      setToken(t)
    }
  }, [])

  const strength      = calcStrength(password)
  const strengthPct   = (strength / 5) * 100
  const strengthText  = strengthLabel[strength]
  const strengthClr   = strengthColor[strength]

  const handleInputFocus = (e) => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}22` }
  const handleInputBlur  = (e) => { e.target.style.borderColor = inputStyle.borderColor; e.target.style.boxShadow = '' }

  const validate = () => {
    const errs = {}
    if (!password || password.length < 8) errs.password = 'Mínimo 8 caracteres'
    if (password !== confirmPassword)      errs.confirmPassword = 'Las contraseñas no coinciden'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/auth/activate', { token, password })
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al activar la cuenta. El enlace puede haber caducado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // si no hay token en la URL mostramos error
  if (tokenInvalid) {
    return (
      <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
        <CSSVariables config={config} />
        <div className="w-full max-w-md rounded-2xl p-10 border text-center backdrop-blur-sm shadow-xl" style={cardStyle}>
          <p className="text-red-400 font-semibold mb-4">Enlace de activación inválido</p>
          <p className="text-sm mb-6" style={{ color: mutedColor }}>
            El enlace no contiene un token válido. Solicita un nuevo enlace al administrador.
          </p>
          <Link to="/login" className="text-sm font-medium" style={{ color: primary }}>Ir al inicio de sesión</Link>
        </div>
      </div>
    )
  }

  // pantalla de éxito cuando se activa la cuenta
  if (success) {
    return (
      <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
        <CSSVariables config={config} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl p-10 border text-center backdrop-blur-sm shadow-xl"
          style={cardStyle}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${primary}20` }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={primary} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: primary }}>¡Cuenta activada!</h2>
          <p className="text-sm mb-8" style={{ color: mutedColor }}>
            Tu contraseña ha sido establecida. Ya puedes iniciar sesión.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
          >
            Ir al inicio de sesión
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
      <CSSVariables config={config} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl p-8 border backdrop-blur-sm shadow-xl"
        style={cardStyle}
      >
        {/* Header */}
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={storeName} className="h-12 mx-auto mb-4 object-contain" />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${primary}20` }}
            >
              <Lock className="w-6 h-6" style={{ color: primary }} />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#111827' }}>
            Activar cuenta
          </h1>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>
            Establece tu contraseña para acceder a {storeName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>
              Nueva contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })) }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-10 py-3 rounded-lg border text-sm outline-none transition-all"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: mutedColor }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength bar */}
            {password && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${strengthPct}%`, backgroundColor: strengthClr }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: strengthClr }}>{strengthText}</p>
              </div>
            )}
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })) }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Repite la contraseña"
                className="w-full pl-10 pr-10 py-3 rounded-lg border text-sm outline-none transition-all"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: mutedColor }}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm text-red-400 border border-red-500/20 bg-red-500/10">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
          >
            {loading ? 'Activando...' : 'Activar cuenta'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: mutedColor }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: primary }}>
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Activate
