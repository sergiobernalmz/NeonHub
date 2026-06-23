import { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from './ToastContext'
import { useSettings } from './SettingsContext'
import axios from 'axios'
import cartService from '../services/cartService'

const AuthContext = createContext()

const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(sessionStorage.getItem('token') || localStorage.getItem('token'))
  const [electronTenant, setElectronTenant] = useState(() => {
    if (!window.electron?.isElectron) return null
    const role = sessionStorage.getItem('electron_role')
    const tenantId = sessionStorage.getItem('electron_tenant_id')
    if (role === 'superadmin') return { role: 'superadmin', tenantId: null }
    if (tenantId) return { role, tenantId }
    return null
  })
  const { showSuccess, showError } = useToast()
  const { loadSettingsForUser, resetToAnonymous } = useSettings()

  const getSessionDuration = () => {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    return settings.sessionDuration || 5 // minutes
  }

  const isSessionValid = () => {
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) {
      // si no existe lastActivity, lo creamos ahora (compatibilidad hacia atrás)
      updateLastActivity()
      return true
    }

    const sessionDuration = getSessionDuration()
    const now = Date.now()
    const lastActivityTime = parseInt(lastActivity)
    const sessionTimeout = sessionDuration * 60 * 1000 // convert to ms

    return (now - lastActivityTime) < sessionTimeout
  }

  const updateLastActivity = () => {
    if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('lastActivity', Date.now().toString())
    } else {
      localStorage.setItem('lastActivity', Date.now().toString())
    }
  }

  const getDefaultRouteForUser = (user) => {
    if (!user?.roles?.length) return '/shop' // si no tiene roles, va a la tienda

    const highestRole = user.roles.reduce((prev, current) =>
      (prev.level > current.level) ? prev : current
    )

    switch (highestRole.name) {
      case 'superadmin':
      case 'ceo':
      case 'super_admin':
      case 'admin':
      case 'manager':
      case 'employee':
        return '/dashboard'
      case 'customer':
      default:
        return '/shop'
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('lastActivity')
    localStorage.removeItem('ecommerce_cart')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('lastActivity')
    sessionStorage.removeItem('ecommerce_cart')
    if (window.electron?.isElectron) {
      window.electron.store.clear()
      sessionStorage.removeItem('electron_tenant_id')
      sessionStorage.removeItem('electron_role')
      sessionStorage.removeItem('electron_subdomain')
      setElectronTenant(null)
    }
    delete axios.defaults.headers.common['Authorization']
    resetToAnonymous()
    showSuccess('Sesión cerrada correctamente')

    // en Electron se usa file://, la navegación dura rompe la app.
    // los cambios de estado de React activan RootRedirect → /login automáticamente.
    if (!window.electron?.isElectron) {
      window.location.href = '/shop'
    }
  }

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      updateLastActivity()
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  useEffect(() => {
    if (user) {
      const handleActivity = () => updateLastActivity()

      window.addEventListener('mousedown', handleActivity)
      window.addEventListener('keydown', handleActivity)
      window.addEventListener('scroll', handleActivity)
      window.addEventListener('touchstart', handleActivity)

      return () => {
        window.removeEventListener('mousedown', handleActivity)
        window.removeEventListener('keydown', handleActivity)
        window.removeEventListener('scroll', handleActivity)
        window.removeEventListener('touchstart', handleActivity)
      }
    }
  }, [user])

  useEffect(() => {
    const checkAuth = async () => {
      // intercambio SSO — procesamos el parámetro ?sso= antes que cualquier otra lógica de auth
      const params = new URLSearchParams(window.location.search);
      const ssoParam = params.get('sso');
      if (ssoParam) {

        window.history.replaceState({}, '', window.location.pathname);
        try {
          const response = await axios.post('/api/auth/sso-exchange', { sso_token: ssoParam });
          if (response.data.success) {
            const { accessToken, user: userData } = response.data.data;
            const userObject = {
              id: userData.id,
              name: [userData.firstName, userData.lastName].filter(Boolean).join(' '),
              email: userData.email,
              username: userData.username,
              roles: userData.roles,
              userPermissions: userData.userPermissions || {}
            };
            setToken(accessToken);
            setUser(userObject);
            localStorage.setItem('token', accessToken);
            localStorage.setItem('user', JSON.stringify(userObject));
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            updateLastActivity();
            loadSettingsForUser(userObject.id);
            setLoading(false);
            return;
          }
        } catch (_e) {
          // falló el intercambio SSO — seguimos con la comprobación de auth normal
        }
      }

      let userResolved = false

      if (token) {
        try {

          if (!isSessionValid()) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('lastActivity')
            setToken(null)
            setUser(null)
            delete axios.defaults.headers.common['Authorization']
            // seguimos hacia la comprobación de auto-login demo
          } else {
            // comprobamos que el JWT tiene el formato correcto
            const tokenParts = token.split('.')
            if (tokenParts.length !== 3) {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              sessionStorage.removeItem('token')
              sessionStorage.removeItem('user')
              setToken(null)
              setUser(null)
              delete axios.defaults.headers.common['Authorization']
              // seguimos hacia la comprobación de auto-login demo
            } else {
              // comprobamos si el JWT ha expirado
              let tokenExpired = false
              try {
                const payload = JSON.parse(atob(tokenParts[1]))
                const now = Math.floor(Date.now() / 1000)
                if (payload.exp && payload.exp < now) tokenExpired = true
              } catch (_e) {
                tokenExpired = true
              }

              if (tokenExpired) {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                sessionStorage.removeItem('token')
                sessionStorage.removeItem('user')
                setToken(null)
                setUser(null)
                delete axios.defaults.headers.common['Authorization']
                // seguimos hacia la comprobación de auto-login demo
              } else {
                const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user')
                if (savedUser) {
                  try {
                    const parsedUser = JSON.parse(savedUser)
                    setUser(parsedUser)
                    updateLastActivity()
                    loadSettingsForUser(parsedUser.id)
                    userResolved = true
                  } catch (parseError) {
                    console.error('Error parsing saved user:', parseError)
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('lastActivity')
                    setToken(null)
                    setUser(null)
                    delete axios.defaults.headers.common['Authorization']
                  }
                } else {
                  localStorage.removeItem('token')
                  localStorage.removeItem('lastActivity')
                  setToken(null)
                  setUser(null)
                  delete axios.defaults.headers.common['Authorization']
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking auth:', error)
          const savedUser = localStorage.getItem('user')
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser)
              setUser(parsedUser)
              userResolved = true
            } catch (parseError) {
              console.error('Error parsing saved user:', parseError)
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('lastActivity')
              setToken(null)
              setUser(null)
              delete axios.defaults.headers.common['Authorization']
            }
          }
        }
      }

      // auto-login en subdominio demo: se ejecuta antes de setLoading(false) para que ProtectedRoute
      // nunca renderice con user=null y evitar la cascada de 401 en la primera visita.
      if (!userResolved && window.location.hostname.split('.')[0] === 'demo') {
        try {
          const response = await axios.post('/api/auth/demo')
          const { data } = response.data
          const { user: userData, accessToken } = data
          const demoUserObj = {
            id: userData.id,
            name: [userData.firstName, userData.lastName].filter(Boolean).join(' '),
            email: userData.email,
            username: userData.username,
            roles: userData.roles,
            userPermissions: userData.userPermissions || {},
            isDemo: true
          }
          setToken(accessToken)
          setUser(demoUserObj)
          sessionStorage.setItem('token', accessToken)
          sessionStorage.setItem('user', JSON.stringify(demoUserObj))
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          updateLastActivity()
        } catch (_e) {
          // falló el login demo — mostramos la página de login
        }
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await axios.post('/api/auth/login', {
        login: email,
        password: password
      })

      const { data } = response.data
      const { user: userData, accessToken } = data

      const userObject = {
        id: userData.id,
        name: [userData.firstName, userData.lastName].filter(Boolean).join(' '),
        email: userData.email,
        username: userData.username,
        roles: userData.roles,
        userPermissions: userData.userPermissions || {},
        isSuperAdminProxy: userData.isSuperAdminProxy || false,
        proxyStoreId: userData.proxyStoreId || null,
        theme_preference: userData.theme_preference || 'dark'
      }

      if (userData.theme_preference) {
        const settingsKey = `appSettings_${userObject.id}`;
        const savedSettings = localStorage.getItem(settingsKey);
        const currentSettings = savedSettings ? JSON.parse(savedSettings) : {};
        localStorage.setItem(settingsKey, JSON.stringify({
          ...currentSettings,
          darkMode: userData.theme_preference === 'dark'
        }));
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      setToken(accessToken)
      setUser(userObject)
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', accessToken)
      storage.setItem('user', JSON.stringify(userObject))
      if (window.electron?.isElectron) {
        window.electron.store.set('token', accessToken)
        window.electron.store.set('user', JSON.stringify(userObject))
      }
      updateLastActivity()
      loadSettingsForUser(userObject.id)

      // sincronizamos el carrito local con el backend tras el login
      try {
        const localCart = localStorage.getItem('ecommerce_cart')
        if (localCart) {
          const cartData = JSON.parse(localCart)
          if (cartData.items && cartData.items.length > 0) {
            await cartService.syncLocalCart(cartData.items)
          }
        }
      } catch (cartError) {
        console.error('Error syncing cart after login:', cartError)
      }

      return { success: true, user: userObject }
    } catch (error) {
      const status = error.response?.status
      if (status !== 401 && status !== 423) {
        console.error('Error en login:', error)
      }
      return {
        success: false,
        status,
        message: error.response?.data?.message || 'Error al iniciar sesión',
        remaining_minutes: error.response?.data?.remaining_minutes || null
      }
    }
  }

  const demoLogin = async () => {
    try {
      const response = await axios.post('/api/auth/demo')

      const { data } = response.data
      const { user: userData, accessToken } = data

      const userObject = {
        id: userData.id,
        name: [userData.firstName, userData.lastName].filter(Boolean).join(' '),
        email: userData.email,
        username: userData.username,
        roles: userData.roles,
        userPermissions: userData.userPermissions || {},
        isDemo: true
      }

      setToken(accessToken)
      setUser(userObject)

      // Para demo usamos sessionStorage, para que al cerrar la pestaña se desloguee automáticamente
      sessionStorage.setItem('token', accessToken)
      sessionStorage.setItem('user', JSON.stringify(userObject))
      updateLastActivity()
      loadSettingsForUser(userObject.id)

      return { success: true, user: userObject }
    } catch (error) {
      console.error('Error en demo login:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error al entrar en modo demo'
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData)

      const { data } = response.data
      const { user: newUser } = data

      // registro correcto — redirigimos al login
      // (el backend no devuelve token al registrarse)
      return {
        success: true,
        message: 'Usuario registrado exitosamente. Inicia sesión.',
        user: {
          id: newUser.id,
          name: [newUser.firstName, newUser.lastName].filter(Boolean).join(' '),
          email: newUser.email,
          username: newUser.username,
          roles: []
        },
        requiresLogin: true
      }
    } catch (error) {
      console.error('Error en registro:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrarse'
      }
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData)
      const updatedUser = response.data.data.user
      const newUserData = {
        id: updatedUser.id,
        name: [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' '),
        email: updatedUser.email,
        username: updatedUser.username,
        phone: updatedUser.phone,
        roles: user?.roles || []
      }
      setUser(newUserData)
      localStorage.setItem('user', JSON.stringify(newUserData))
      return { success: true }
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar perfil'
      }
    }
  }

  const changePassword = async (passwordData) => {
    try {
      await axios.put('/api/auth/change-password', passwordData)
      return { success: true }
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error al cambiar contraseña'
      }
    }
  }

  const requestPasswordChange = async () => {
    try {
      await axios.post('/api/auth/request-password-change')
      return { success: true }
    } catch (error) {
      console.error('Error solicitando cambio de contraseña:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error al solicitar el cambio'
      }
    }
  }

  const selectElectronTenant = ({ role, tenantId, subdomain }) => {
    if (tenantId) {
      sessionStorage.setItem('electron_tenant_id', String(tenantId))
    }
    if (subdomain) {
      sessionStorage.setItem('electron_subdomain', subdomain)
    }
    if (role === 'superadmin') {
      sessionStorage.setItem('electron_role', 'superadmin')
    }
    setElectronTenant({ role, tenantId, subdomain })
  }

  const changeStore = () => {
    sessionStorage.removeItem('electron_tenant_id')
    sessionStorage.removeItem('electron_role')
    sessionStorage.removeItem('electron_subdomain')
    setElectronTenant(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    demoLogin,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordChange,
    getDefaultRouteForUser,
    isAuthenticated: !!user,
    electronTenant,
    selectElectronTenant,
    changeStore,
    needsTenantSelection: !!(window.electron?.isElectron && user && !electronTenant),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider, useAuth }
