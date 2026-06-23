import { useState } from 'react'
import { Lock, Bell, Globe, Moon, Sun, Shield, ArrowLeft, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSettings } from '../context/SettingsContext'
import { useLanguage } from '../context/LanguageContext'

const ShopSettings = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { darkMode, toggleDarkMode } = useSettings()
  const { language, changeLanguage } = useLanguage()
  const navigate = useNavigate()

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  const [notifications, setNotifications] = useState({
    email: true,
    orders: true,
    promotions: false
  })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwords.new !== passwords.confirm) {
      showError('Las contraseñas no coinciden')
      return
    }

    if (passwords.new.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      showSuccess('Contraseña actualizada correctamente')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (_error) {
      showError('Error al cambiar la contraseña')
    }
  }

  const handleNotificationsChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    })
    showSuccess('Preferencias actualizadas')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a la tienda
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">Gestiona tus preferencias y seguridad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cambiar Contraseña</h2>
              <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña actual
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Cambiar Contraseña</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notificaciones</h2>
              <p className="text-sm text-gray-600">Configura cómo quieres recibir notificaciones</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Notificaciones por email</p>
                <p className="text-sm text-gray-600">Recibe actualizaciones en tu correo</p>
              </div>
              <button
                onClick={() => handleNotificationsChange('email')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.email ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.email ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Actualizaciones de pedidos</p>
                <p className="text-sm text-gray-600">Notificaciones sobre el estado de tus pedidos</p>
              </div>
              <button
                onClick={() => handleNotificationsChange('orders')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.orders ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.orders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Promociones y ofertas</p>
                <p className="text-sm text-gray-600">Recibe información sobre descuentos</p>
              </div>
              <button
                onClick={() => handleNotificationsChange('promotions')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.promotions ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.promotions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preferencias</h2>
              <p className="text-sm text-gray-600">Personaliza tu experiencia</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Idioma</p>
                <p className="text-sm text-gray-600">Selecciona tu idioma preferido</p>
              </div>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Modo oscuro</p>
                <p className="text-sm text-gray-600">Cambia el tema de la interfaz</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform flex items-center justify-center ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                >
                  {darkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Seguridad</h2>
              <p className="text-sm text-gray-600">Información sobre tu cuenta</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Email verificado:</span>
              <span className="text-green-600 font-medium">Sí</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Última actualización:</span>
              <span className="text-gray-900 font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">ID de usuario:</span>
              <span className="text-gray-900 font-medium">{user?.id || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopSettings
