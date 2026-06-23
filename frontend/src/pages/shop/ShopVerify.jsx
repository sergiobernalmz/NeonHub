import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useConfig } from '../../context/ConfigContext'
import CSSVariables from '../../components/shop/CSSVariables'
import axios from 'axios'

const ShopVerify = () => {
  const config   = useConfig()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading')

  const primary    = config?.colors?.primary || '#2563eb'
  const bg         = config?.colors?.background || '#ffffff'
  const isDark     = bg !== '#ffffff'
  const storeName  = config?.name || 'la tienda'
  const logo       = config?.logo

  const cardStyle  = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const mutedColor = isDark ? '#64748b' : '#6b7280'
  const textColor  = isDark ? '#f1f5f9' : '#111827'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')

    if (!token) {
      setStatus('no-token')
      return
    }

    axios.post('/api/public/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  const content = () => {
    if (status === 'loading') {
      return (
        <>
          <div className="flex items-center justify-center mb-6">
            <svg className="animate-spin h-10 w-10" style={{ color: primary }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-center" style={{ color: textColor }}>
            Verificando tu cuenta...
          </h2>
        </>
      )
    }

    if (status === 'success') {
      return (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${primary}20` }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={primary} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center mb-3" style={{ color: primary }}>
            ¡Email verificado!
          </h2>
          <p className="text-sm text-center mb-8" style={{ color: mutedColor }}>
            Bienvenido/a a <strong style={{ color: textColor }}>{storeName}</strong>. Ya puedes realizar pedidos.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
          >
            Ir a la tienda
          </button>
        </>
      )
    }

    // si hay error o no hay token mostramos este bloque
    return (
      <>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.12)' }}
        >
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center mb-3 text-red-400">
          Enlace no válido
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: mutedColor }}>
          Este enlace de verificación es inválido o ha caducado (24 h). Regístrate de nuevo para recibir un nuevo enlace.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
        >
          Solicitar nuevo enlace
        </button>
      </>
    )
  }

  return (
    <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
      <CSSVariables config={config} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl p-10 border backdrop-blur-sm shadow-xl"
        style={cardStyle}
      >
        {logo && (
          <img src={logo} alt={storeName} className="h-10 mx-auto mb-8 object-contain" />
        )}
        {content()}
        <p className="text-center text-sm mt-6" style={{ color: mutedColor }}>
          ¿Ya verificaste?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: primary }}>
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default ShopVerify
