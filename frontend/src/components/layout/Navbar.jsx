import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, User, Menu, LogOut, Settings, ShoppingBag } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useConfig } from '../../context/ConfigContext'
import { useSettings } from '../../context/SettingsContext'
import LanguageSelector from '../LanguageSelector'
import notificationService from '../../services/notificationService'
import { ROUTES } from '../../constants/routes'

const Navbar = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const config = useConfig()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  // const [notificationsFetched, setNotificationsFetched] = useState(false) // Removed to force refresh

  // Referencias para detectar clics fuera
  const userMenuRef = useRef(null)
  const notificationsRef = useRef(null)
  const languageMenuRef = useRef(null)

  // cerramos cualquier menú abierto si el usuario hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // cargamos notificaciones al montar
  useEffect(() => {
    if (user) {
      fetchUnreadCount()

      // actualizamos el contador cada 30 segundos (solo el número, no la lista entera)
      const interval = setInterval(() => {
        fetchUnreadCount()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [user])

  // cada vez que se abre el desplegable recargamos las notificaciones
  useEffect(() => {
    if (showNotifications && user) {
      fetchNotifications()
    }
  }, [showNotifications, user])

  const fetchNotifications = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      const response = await notificationService.list({ limit: 5, isRead: false })
      if (response.success) {
        setNotifications(response.data.notifications)
        setUnreadCount(response.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount()
      if (response.success) {
        setUnreadCount(response.data.count)
      }
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }

  // Función para cerrar todos los menús
  const closeAllMenus = () => {
    setShowUserMenu(false)
    setShowNotifications(false)
    setShowLanguageMenu(false)
  }

  // Función para manejar la apertura/cierre de menús
  const toggleMenu = (menuType) => {
    switch (menuType) {
      case 'user':
        setShowUserMenu(true)
        setShowNotifications(false)
        setShowLanguageMenu(false)
        break
      case 'notifications':
        setShowNotifications(prev => !prev)
        setShowUserMenu(false)
        setShowLanguageMenu(false)
        break
      case 'language':
        setShowLanguageMenu(prev => !prev)
        setShowUserMenu(false)
        setShowNotifications(false)
        break
      default:
        closeAllMenus()
    }
  }

  const handleNotificationClick = async (notification) => {
    try {
      // marcamos como leída sin esperar para que se sienta más rápido
      notificationService.markAsRead(notification.id).catch(err =>
        console.error('Error marking notification as read:', err)
      )

      // actualizamos el estado local al momento
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
      setUnreadCount(prev => Math.max(0, prev - 1))

      // cerramos el menú y navegamos
      closeAllMenus()
      if (notification.actionUrl) {
        navigate(notification.actionUrl)
      }
    } catch (err) {
      console.error('Error handling notification click:', err)
    }
  }

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Hace un momento'

    const date = new Date(dateString)
    // comprobamos que la fecha sea válida
    if (isNaN(date.getTime())) return 'Hace un momento'

    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const handleViewAllNotifications = () => {
    closeAllMenus()
    // Navegar a una página de notificaciones o mostrar modal
    navigate('/dashboard') // Por ahora redirige al dashboard
  }

  // Handlers para el menú de usuario
  const handleProfileClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowUserMenu(false)
    navigate(ROUTES.DASHBOARD_PROFILE)
  }

  const handleShopClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowUserMenu(false)
    navigate('/shop')
  }

  const handleSettingsClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowUserMenu(false)
    navigate(ROUTES.DASHBOARD_SETTINGS)
  }

  const handleLogoutClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowUserMenu(false)
    logout()
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="nav-blur sticky top-0 z-50 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-4">
          {/* Botón menú móvil */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-300" />
          </button>

          {/* Logo */}
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            {config?.logo ? (
              <img src={config.logo} alt="Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {(config?.dashboardName || config?.name || 'N').substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          {/* Búsqueda móvil */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
            <Search className="w-6 h-6 text-gray-300" />
          </button>

          {/* Selector de idioma */}
          <LanguageSelector
            isOpen={showLanguageMenu}
            onToggle={() => toggleMenu('language')}
            onClose={closeAllMenus}
          />

          {/* Notificaciones */}
          <div className="relative" ref={notificationsRef}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleMenu('notifications')}
              className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors relative"
            >
              <Bell className="w-6 h-6 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-400 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </motion.button>

            {/* Desplegable de notificaciones */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl p-4"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px var(--shadow)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-green-400 mb-3">{t('notifications')}</h3>
                  {loading ? (
                    <div className="text-center py-4 text-gray-400">{t('loading')}</div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">{t('noNotifications')}</div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => {
                        const timeAgo = getTimeAgo(notification.createdAt)
                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer"
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.category === 'order' ? 'bg-green-400' :
                              notification.type === 'warning' ? 'bg-yellow-400' :
                                notification.type === 'error' ? 'bg-red-400' :
                                  notification.type === 'success' ? 'bg-green-400' :
                                    'bg-blue-400'
                              }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-200">{notification.title}</p>
                              <p className="text-xs text-gray-300 mt-0.5">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={handleViewAllNotifications}
                    className="w-full mt-3 text-sm text-green-400 hover:text-blue-400 transition-colors"
                  >
                    {t('viewAllNotifications')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Menú de usuario */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleMenu('user')}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${showUserMenu
                ? 'bg-gray-700/70 text-white'
                : 'hover:bg-gray-700/50 text-gray-200'
                }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showUserMenu
                ? 'bg-gradient-to-r from-green-400 to-blue-500'
                : 'bg-gradient-neon'
                }`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="hidden sm:block font-medium">
                {user?.name || 'Usuario'}
              </span>
            </motion.button>

            {/* Desplegable de usuario */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 rounded-xl p-3 z-50"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px var(--shadow)'
                  }}
                >
                  <div className="px-3 py-3 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user?.name || 'Usuario'}</p>
                        <p className="text-xs text-gray-400">{user?.email || 'No email'}</p>
                        {user?.roles && user.roles.length > 0 && (
                          <p className="text-xs text-green-400 font-medium">
                            {user.roles[0].displayName || user.roles[0].name}
                          </p>
                        )}
                        {user?.store && (
                          <p className="text-xs text-blue-400 font-medium mt-0.5">
                            {user.store.name} ({user.store.subdomain})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-200"
                    >
                      <User className="w-4 h-4" />
                      <span>{t('myProfile')}</span>
                    </button>
                    <button
                      onClick={handleShopClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 hover:text-green-300 rounded-lg transition-all duration-200"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t('goToStore')}</span>
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('settingsTitle')}</span>
                    </button>
                    <hr className="my-2 border-gray-700/50" />
                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar