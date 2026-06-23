import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useConfig } from '../../context/ConfigContext'
import CSSVariables from '../../components/shop/CSSVariables'

const ShopLogin = () => {
  const config = useConfig()
  const { login, getDefaultRouteForUser, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) {
      const level = user.roles?.reduce((max, r) => Math.max(max, r.level || 0), 0) ?? 0
      navigate(level >= 40 ? '/dashboard' : '/shop', { replace: true })
    }
  }, [user])

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountLocked, setAccountLocked] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  const storeName = config?.name || 'Tienda'
  const logo = config?.logo
  const primary = config?.colors?.primary || '#2563eb'

  const bg = config?.colors?.background || '#ffffff'
  const isDark = bg !== '#ffffff'
  const cardStyle = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const labelColor  = isDark ? '#94a3b8' : '#374151'
  const inputStyle  = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }
  const textColor   = isDark ? '#f1f5f9' : '#111827'
  const mutedColor  = isDark ? '#64748b' : '#6b7280'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setAccountLocked(false)
    const result = await login(formData.email, formData.password, rememberMe)
    if (result.success) {
      const from = location.state?.from?.pathname
      if (from && from !== '/login') {
        navigate(from, { replace: true })
      } else {
        navigate(getDefaultRouteForUser(result.user))
      }
    } else if (result.status === 423) {
      setAccountLocked(true)
      setRemainingMinutes(result.remaining_minutes || 120)
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleInputFocus  = (e) => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}22` }
  const handleInputBlur   = (e) => { e.target.style.borderColor = inputStyle.borderColor; e.target.style.boxShadow = '' }

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
          <p className="mt-1 text-sm" style={{ color: mutedColor }}>Inicia sesión en tu cuenta</p>
        </div>

        <div
          className="rounded-2xl p-8 border backdrop-blur-sm shadow-xl"
          style={cardStyle}
        >
          {accountLocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg text-sm"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}
            >
              <p className="font-semibold mb-1">Cuenta bloqueada temporalmente</p>
              <p className="text-xs" style={{ opacity: 0.8 }}>
                Demasiados intentos fallidos. Inténtalo de nuevo en{' '}
                <span className="font-semibold">{remainingMinutes} minuto{remainingMinutes !== 1 ? 's' : ''}</span>{' '}
                o revisa tu email para desbloquear tu cuenta.
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  style={{ ...inputStyle, transition: 'border-color .15s, box-shadow .15s' }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  style={{ ...inputStyle, transition: 'border-color .15s, box-shadow .15s' }}
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm outline-none"
                  placeholder="••••••••"
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
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: primary }}
                />
                <span className="text-sm" style={{ color: mutedColor }}>Recuérdame</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: mutedColor }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="w-full py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
              onMouseOut={e => { e.currentTarget.style.filter = '' }}
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm" style={{ color: mutedColor }}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: primary }}
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: mutedColor }}>
          ¿Eres empleado o administrador? Inicia sesión con tus credenciales y serás redirigido al panel de gestión.
        </p>
      </motion.div>
    </div>
  )
}

export default ShopLogin
