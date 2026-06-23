import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Calendar, Shield, Edit, Save, X, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'

const Profile = () => {
  const { user, updateProfile, requestPasswordChange } = useAuth()
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  const [isEditing, setIsEditing] = useState(false)
  const [passwordEmailSent, setPasswordEmailSent] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      // Separar el nombre completo en nombre y apellido
      const nameParts = user.name ? user.name.split(' ') : ['', '']
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || ''
      })
    }
  }, [user])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('nameRequired')
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = t('nameMinLength')
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('lastNameRequired')
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = t('lastNameMinLength')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('emailInvalid')
    }

    if (formData.phone && !/^[\+]?[0-9\-\s()]{9,15}$/.test(formData.phone)) {
      newErrors.phone = t('phoneInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const result = await updateProfile(formData)
      if (result.success) {
        setIsEditing(false)
        showSuccess('Perfil actualizado correctamente')
      } else {
        showError(result.message || 'Error al actualizar perfil')
      }
    } catch (_error) {
      showError('Error al actualizar perfil')
    }
    setLoading(false)
  }

  const handleRequestPasswordChange = async () => {
    setLoading(true)
    try {
      const result = await requestPasswordChange()
      if (result.success) {
        setPasswordEmailSent(true)
        showSuccess('Enlace de cambio enviado a tu email')
      } else {
        showError(result.message || 'Error al solicitar el cambio de contraseña')
      }
    } catch (_error) {
      showError('Error al solicitar el cambio de contraseña')
    }
    setLoading(false)
  }

  const handleCancel = () => {
    if (user) {
      const nameParts = user.name ? user.name.split(' ') : ['', '']
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || ''
      })
    }
    setIsEditing(false)
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('profileTitle')}</h1>
          <p className="text-gray-400 mt-1">{t('profileDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <button className="absolute bottom-2 right-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <h3 className="text-xl font-semibold text-white mt-4">{user?.name}</h3>
              <p className="text-gray-400">{user?.email}</p>
              <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {t('memberSince')} {new Date().toLocaleDateString()}
              </div>
              {user?.roles && user.roles.length > 0 && (
                <div className="flex items-center justify-center mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.roles[0].displayName || user.roles[0].name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">{t('profileTitle')}</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('editProfile')}</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? t('saving') : t('save')}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('cancel')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('firstName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                    } ${errors.firstName ? 'border-red-500' : 'border-gray-600'}`}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('lastName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                    } ${errors.lastName ? 'border-red-500' : 'border-gray-600'}`}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    disabled={true}
                    className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white opacity-60 cursor-not-allowed"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">El nombre de usuario no se puede cambiar</p>
              </div>

              {/* Email */}
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
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                    } ${errors.email ? 'border-red-500' : 'border-gray-600'}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Número de teléfono (opcional)"
                    className={`w-full px-4 py-2 pl-10 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                    } ${errors.phone ? 'border-red-500' : 'border-gray-600'}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{t('security')}</h2>
            <p className="text-gray-400 text-sm mb-4">
              Recibirás un enlace en tu email para establecer una nueva contraseña de forma segura.
            </p>
            {passwordEmailSent ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Shield className="w-4 h-4" />
                Enlace enviado a <span className="font-medium">{user?.email}</span>. Revisa tu bandeja de entrada.
              </div>
            ) : (
              <button
                onClick={handleRequestPasswordChange}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? t('sending') : t('changePassword')}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Profile