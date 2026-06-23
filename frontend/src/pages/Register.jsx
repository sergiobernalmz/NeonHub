import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Leaf, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import LanguageSelector from '../components/LanguageSelector'
import API_BASE_URL from '../config/api'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // accedemos a searchParams aquí arriba para usarlo en el estado inicial
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()

  // leemos el plan desde la URL si viene como parámetro
  const plan = searchParams.get('plan')

  const [formData, setFormData] = useState({
    username: searchParams.get('username') || '',
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  const [successMessage, setSuccessMessage] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  // mostramos el mensaje de éxito si el registro fue correcto
  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl border border-green-500/30 max-w-md w-full text-center z-10"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">¡Verifica tu Correo!</h2>
          <p className="text-gray-300 mb-6">{successMessage}</p>
          <p className="text-gray-400 text-sm mb-6">Revisa tu bandeja de entrada (y spam) para activar tu cuenta.</p>

          {plan && (
            <div className="bg-violet-900/30 border border-violet-500/30 p-4 rounded-lg mb-6">
              <p className="text-violet-300 text-sm">
                Has seleccionado el plan: <span className="font-bold uppercase">{plan}</span>.
                <br />
                Una vez verifiques tu correo, podrás completar la compra.
              </p>
            </div>
          )}

          <Link
            to="/login"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Ir al Login
          </Link>
        </motion.div>
      </div>
    )
  }

  const validateForm = () => {
    const errors = {}

    // validamos el nombre de usuario
    if (!formData.username.trim()) {
      errors.username = 'El nombre de usuario es requerido'
    } else if (formData.username.length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos'
    }

    // validamos el email
    if (!formData.email.trim()) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Debe ser un email válido'
    }

    // validamos la contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres'
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      errors.password = 'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial'
    }

    // comprobamos que las contraseñas coincidan
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden'
    }

    // validamos el nombre
    if (!formData.firstName.trim()) {
      errors.firstName = 'El nombre es requerido'
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'El nombre debe tener al menos 2 caracteres'
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.firstName)) {
      errors.firstName = 'El nombre solo puede contener letras y espacios'
    }

    // validamos el apellido
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es requerido'
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'El apellido debe tener al menos 2 caracteres'
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.lastName)) {
      errors.lastName = 'El apellido solo puede contener letras y espacios'
    }

    // validamos el teléfono (campo opcional)
    if (formData.phone && !/^[\+]?[0-9\-\s()]{9,15}$/.test(formData.phone)) {
      errors.phone = 'El teléfono debe tener un formato válido'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/public/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          plan: plan // mandamos el plan al backend si viene en la URL
        })
      })

      const data = await response.json()

      if (data.success) {
        if (data.data?.requiresVerification) {
          // Mostrar mensaje de éxito y requerimiento de verificación
          setSuccessMessage(data.message || 'Cuenta creada. Verifica tu email.')
          setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            phone: ''
          })
        } else {
          // Redirigir al login después del registro exitoso (comportamiento antiguo/fallback)
          navigate('/login')
        }
      } else {
        setError(data.message || 'Error al crear la cuenta')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Error de conexión. Intenta nuevamente.')
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    // limpiamos el error de validación cuando el usuario empieza a escribir
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Volver al login */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          to="/login"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver al Login
        </Link>
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
        className="relative z-10 w-full max-w-2xl p-8"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EcoCommerce</h1>
          <p className="text-gray-400">Crear nueva cuenta</p>
        </motion.div>

        {/* formulario de registro */}
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center">
            Registro de Usuario
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* campo usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.username ? 'border-red-500' : 'border-gray-600'
                    }`}
                  placeholder="usuario123"
                  required
                />
              </div>
              {validationErrors.username && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.username}</p>
              )}
            </div>

            {/* campo email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              {validationErrors.email && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Name Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.firstName ? 'border-red-500' : 'border-gray-600'
                      }`}
                    placeholder="Juan"
                    required
                  />
                </div>
                {validationErrors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.firstName}</p>
                )}
              </div>

              {/* apellido */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Apellido
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.lastName ? 'border-red-500' : 'border-gray-600'
                      }`}
                    placeholder="Pérez"
                    required
                  />
                </div>
                {validationErrors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* campo teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono (Opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.phone ? 'border-red-500' : 'border-gray-600'
                    }`}
                  placeholder="+34 123 456 789"
                />
              </div>
              {validationErrors.phone && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.phone}</p>
              )}
            </div>

            {/* campo contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pl-10 pr-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.password ? 'border-red-500' : 'border-gray-600'
                    }`}
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
              {validationErrors.password && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 pl-10 pr-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-green-400 bg-gray-700 border-gray-600 rounded focus:ring-green-400 focus:ring-2"
                required
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
                Acepto los{' '}
                <a href="#" className="text-green-400 hover:text-blue-400 transition-colors">
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="#" className="text-green-400 hover:text-blue-400 transition-colors">
                  política de privacidad
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="loader-neon mr-2" />
                  Creando cuenta...
                </div>
              ) : (
                'Crear Cuenta'
              )}
            </motion.button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="text-green-400 hover:text-blue-400 transition-colors font-medium"
              >
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-gray-400">
            © 2024 EcoCommerce. Comercio sostenible para un futuro mejor.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Register