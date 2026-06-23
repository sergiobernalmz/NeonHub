import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import LanguageSelector from '../components/LanguageSelector'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountLocked, setAccountLocked] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  const { login, user, getDefaultRouteForUser } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const openExternal = (url) => {
    if (window.electron?.openExternal) {
      window.electron.openExternal(url)
    } else if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setAccountLocked(false)

    const result = await login(formData.email, formData.password)

    if (result.success) {
      // Esperar un momento para que el user se actualice en el context
      setTimeout(() => {
        const defaultRoute = getDefaultRouteForUser(result.user || user)
        navigate(defaultRoute)
      }, 100)
    } else if (result.status === 423) {
      setAccountLocked(true)
      setRemainingMinutes(result.remaining_minutes || 120)
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Selector de idioma */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      {/* efectos de fondo */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        {/* logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <img
            src="./neonhub.png"
            alt="NeonHub"
            className="w-16 h-16 rounded-2xl mb-4 mx-auto"
            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}
          />
          <h1 className="text-3xl font-bold text-white mb-2">NeonHub</h1>
          <p className="text-gray-400">Panel de Administración</p>
        </motion.div>

        {/* formulario de login */}
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center">
            {t('loginTitle')}
          </h2>

          {accountLocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/10 border border-orange-500/30 text-orange-300 p-4 rounded-lg mb-4 text-sm"
            >
              <p className="font-semibold mb-1">Cuenta bloqueada temporalmente</p>
              <p className="text-xs text-orange-300/80">
                Demasiados intentos fallidos. Puedes volver a intentarlo en{' '}
                <span className="font-semibold">{remainingMinutes} minuto{remainingMinutes !== 1 ? 's' : ''}</span>{' '}
                o revisar tu email para recibir un enlace de desbloqueo inmediato.
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm"
            >
              {error}
              {window.electron?.isElectron && error === 'Credenciales inválidas' && (
                <p className="mt-2 text-xs text-red-300/80">
                  ¿Te registraste en neonhub.es? El panel de escritorio es solo para gestores de tienda.
                  Tu acceso se activa automáticamente cuando se crea tu tienda.{' '}
                  <button
                    type="button"
                    className="underline cursor-pointer"
                    onClick={() => openExternal('https://neonhub.es')}
                  >
                    Más info
                  </button>
                </p>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* campo de email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="admin@test.com"
                  required
                />
              </div>
            </div>

            {/* campo de contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pl-10 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* recordarme */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-green-400 bg-gray-700 border-gray-600 rounded focus:ring-green-400 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-400">{t('rememberMe')}</span>
              </label>
              <button
                type="button"
                className="text-sm text-green-400 hover:text-blue-400 transition-colors bg-transparent border-0 cursor-pointer p-0"
                onClick={() => window.electron?.isElectron
                  ? openExternal('https://neonhub.es/auth/forgot-password')
                  : navigate('/forgot-password')
                }
              >
                {t('forgotPassword')}
              </button>
            </div>

            {/* botón de envío */}
            <motion.button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="loader-neon mr-2" />
                  Iniciando sesión...
                </div>
              ) : (
                t('loginButton')
              )}
            </motion.button>
          </form>

          {/* enlace al registro */}
          <div className="text-center mt-6">
            {window.electron?.isElectron ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                ¿No tienes tienda?{' '}
                <span
                  style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => openExternal('https://neonhub.es/register')}
                >
                  Crea una en neonhub.es
                </span>
              </p>
            ) : (
              <p className="text-gray-400 text-sm">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="text-green-400 hover:text-blue-400 transition-colors font-medium"
                >
                  Regístrate aquí
                </Link>
              </p>
            )}
          </div>

        </motion.div>

        {/* pie de página */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-gray-400">
            © 2026 NeonHub. Panel de gestión.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login