import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfig } from '../context/ConfigContext'
import { isDarkColor } from '../utils/colorUtils'
import axios from 'axios'

const ShopProfile = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()
  const config = useConfig()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: ''
  })

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      })
      
      try {
        const response = await axios.get(`/api/users/profile`)
        const userData = response.data.data || response.data
        
        setFormData(prev => ({
          ...prev,
          phone: userData.phone || prev.phone,
          address: userData.address || prev.address
        }))
      } catch (error) {
        if (error.response?.status !== 403) {
          console.error('Error loading additional profile data:', error)
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ')
      const lastName = lastNameParts.join(' ')
      
      await axios.put('/api/users/profile', {
        firstName: firstName || formData.name,
        lastName: lastName || '',
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      })
      
      showSuccess('Perfil actualizado correctamente')
      setIsEditing(false)
      
      const updatedUser = {
        ...user, 
        name: formData.name, 
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error) {
      console.error('Error updating profile:', error)
      showError(error.response?.data?.message || 'Error al actualizar el perfil')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center space-x-6 mb-8 pb-8 border-b">
            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'Usuario'}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {user?.roles?.[0]?.displayName || user?.roles?.[0]?.display_name || 'Cliente'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Editar Perfil
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información de la cuenta</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de registro:</span>
                <span className="text-gray-900 font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="text-green-600 font-medium">Activo</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Estadísticas</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pedidos realizados:</span>
                <span className="text-gray-900 font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total gastado:</span>
                <span className="text-gray-900 font-medium">€0.00</span>
              </div>
            </div>
          </div>
        </div>

        {config?.features?.tickets !== false && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
            <p className="text-sm text-gray-600 mb-4">Contacta con nuestro equipo de soporte técnico para resolver cualquier problema.</p>
            <a
              href="/shop/support"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: config?.colors?.primary || '#3b82f6',
                color: isDarkColor(config?.colors?.primary || '#3b82f6') ? '#fff' : '#000',
                borderRadius: 'var(--btn-radius, 8px)',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              🎫 Contactar con soporte
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShopProfile
