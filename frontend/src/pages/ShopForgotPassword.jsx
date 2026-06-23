import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConfig } from '../context/ConfigContext'
import CSSVariables from '../components/shop/CSSVariables'
import API_BASE_URL from '../config/api'

const ShopForgotPassword = () => {
  const config = useConfig()
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
  const textColor = isDark ? '#f1f5f9' : '#111827'

  const storeName = config?.name || 'Tienda'
  const logo = config?.logo

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleInputFocus = (e) => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}22` }
  const handleInputBlur  = (e) => { e.target.style.borderColor = inputStyle.borderColor; e.target.style.boxShadow = '' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      // siempre mostramos éxito para no revelar si el email existe
      setSubmitted(true)
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
        {/* branding de la tienda */}
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
          <p className="mt-1 text-sm" style={{ color: mutedColor }}>Recupera tu contraseña</p>
        </div>

        <div className="rounded-2xl p-8 border backdrop-blur-sm shadow-xl" style={cardStyle}>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: primary }} />
              <p className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                Revisa tu bandeja de entrada
              </p>
              <p className="text-sm mb-6" style={{ color: mutedColor }}>
                Si <span style={{ color: textColor, fontWeight: 600 }}>{email}</span> está registrado,
                recibirás un enlace para restablecer tu contraseña en breve.
              </p>
              <Link
                to="/login"
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: primary }}
              >
                ← Volver al inicio de sesión
              </Link>
            </motion.div>
          ) : (
            <>
              <p className="text-sm mb-6" style={{ color: mutedColor }}>
                Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      style={{ ...inputStyle, transition: 'border-color .15s, box-shadow .15s' }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
                  onMouseOver={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
                  onMouseOut={e => { e.currentTarget.style.filter = '' }}
                >
                  {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm" style={{ color: mutedColor }}>
                ¿Recuerdas tu contraseña?{' '}
                <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: primary }}>
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ShopForgotPassword
