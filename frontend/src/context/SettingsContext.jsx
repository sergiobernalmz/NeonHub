import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Traducciones
const translations = {
  es: {
    // navegación
    dashboard: 'Panel de Control',
    analytics: 'Analíticas',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',

    // configuración
    profile: 'Perfil',
    security: 'Seguridad',
    appearance: 'Apariencia',
    general: 'General',
    saveChanges: 'Guardar Cambios',

    // formularios
    name: 'Nombre',
    email: 'Correo Electrónico',
    currentPassword: 'Contraseña Actual',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Contraseña',

    // ajustes
    darkMode: 'Modo Oscuro',
    darkModeDescription: 'Interfaz con tema oscuro y efectos neón',
    language: 'Idioma',
    notifications: 'Notificaciones',

    // mensajes
    profileSaved: 'Perfil guardado correctamente',
    securitySaved: 'Configuración de seguridad guardada',
    appearanceSaved: 'Configuración de apariencia guardada',
    generalSaved: 'Configuración general guardada',

    // títulos de página
    settingsTitle: 'Configuración',
    settingsDescription: 'Personaliza tu experiencia en la plataforma',
    dashboardTitle: 'Dashboard',
    dashboardDescription: 'Bienvenido de vuelta, aquí tienes un resumen de tu negocio eco-sostenible',

    // dashboard
    generateReport: 'Generar Reporte',
    totalSales: 'Ventas Totales',
    orders: 'Pedidos',
    products: 'Productos',
    customers: 'Clientes',
    salesVsEco: 'Ventas vs Productos Eco',
    categoryDistribution: 'Distribución por Categorías',
    sustainabilityMetrics: 'Métricas de Sostenibilidad',
    recentOrders: 'Pedidos Recientes',
    viewAll: 'Ver todos',

    // métricas de sostenibilidad
    co2Reduced: 'CO₂ Reducido',
    energySaved: 'Energía Ahorrada',
    waterConserved: 'Agua Conservada',
    materialRecycled: 'Material Reciclado',

    // cabeceras de tabla
    id: 'ID',
    customer: 'Cliente',
    product: 'Producto',
    amount: 'Monto',
    status: 'Estado',

    // estados
    completed: 'Completado',
    pending: 'Pendiente',
    processing: 'Procesando',

    // traducciones de productos
    productsTitle: 'Productos',
    productsDescription: 'Gestiona tu catálogo de productos eco-sostenibles',
    newProduct: 'Nuevo Producto',
    searchProducts: 'Buscar productos...',
    filters: 'Filtros',
    edit: 'Editar',
    stock: 'Stock',

    // traducciones de pedidos
    ordersTitle: 'Pedidos',
    ordersDescription: 'Gestiona todos los pedidos de tu tienda',
    searchOrders: 'Buscar pedidos...',
    orderFilters: 'Filtros de Pedidos',
    all: 'Todos',
    orderStatus: 'Estado del Pedido',
    dateFrom: 'Fecha desde',
    dateTo: 'Fecha hasta',
    orderId: 'ID Pedido',
    date: 'Fecha',
    total: 'Total',
    actions: 'Acciones',
    unknown: 'Desconocido',

    // traducciones de analíticas
    analyticsTitle: 'Analíticas',
    analyticsDescription: 'Análisis detallado del rendimiento de tu negocio',
    exportReport: 'Exportar Reporte',
    monthlySales: 'Ventas Mensuales',
    salesTrend: 'Tendencia de Ventas',
    growth: 'Crecimiento',
    conversion: 'Conversión',
    retention: 'Retención',

    // traducciones de login
    loginTitle: 'Iniciar Sesión',
    testCredentials: 'Credenciales de prueba:',
    password: 'Contraseña',
    rememberMe: 'Recordarme',
    forgotPassword: '¿Olvidaste tu contraseña?',
    loginButton: 'Iniciar Sesión'
  },
  en: {
    // navegación
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    settings: 'Settings',
    logout: 'Logout',

    // configuración
    profile: 'Profile',
    security: 'Security',
    appearance: 'Appearance',
    general: 'General',
    saveChanges: 'Save Changes',

    // formularios
    name: 'Name',
    email: 'Email',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',

    // ajustes
    darkMode: 'Dark Mode',
    darkModeDescription: 'Interface with dark theme and neon effects',
    language: 'Language',
    notifications: 'Notifications',

    // mensajes
    profileSaved: 'Profile saved successfully',
    securitySaved: 'Security settings saved',
    appearanceSaved: 'Appearance settings saved',
    generalSaved: 'General settings saved',

    // títulos de página
    settingsTitle: 'Settings',
    settingsDescription: 'Customize your platform experience',
    dashboardTitle: 'Dashboard',
    dashboardDescription: 'Welcome back, here\'s a summary of your eco-sustainable business',

    // dashboard
    generateReport: 'Generate Report',
    totalSales: 'Total Sales',
    orders: 'Orders',
    products: 'Products',
    customers: 'Customers',
    salesVsEco: 'Sales vs Eco Products',
    categoryDistribution: 'Category Distribution',
    sustainabilityMetrics: 'Sustainability Metrics',
    recentOrders: 'Recent Orders',
    viewAll: 'View All',

    // métricas de sostenibilidad
    co2Reduced: 'CO₂ Reduced',
    energySaved: 'Energy Saved',
    waterConserved: 'Water Conserved',
    materialRecycled: 'Material Recycled',

    // cabeceras de tabla
    id: 'ID',
    customer: 'Customer',
    product: 'Product',
    amount: 'Amount',
    status: 'Status',

    // estados
    completed: 'Completed',
    pending: 'Pending',
    processing: 'Processing',

    // traducciones de productos
    productsTitle: 'Products',
    productsDescription: 'Manage your eco-sustainable product catalog',
    newProduct: 'New Product',
    searchProducts: 'Search products...',
    filters: 'Filters',
    edit: 'Edit',
    stock: 'Stock',

    // traducciones de pedidos
    ordersTitle: 'Orders',
    ordersDescription: 'Manage all your store orders',
    searchOrders: 'Search orders...',
    orderFilters: 'Order Filters',
    all: 'All',
    orderStatus: 'Order Status',
    dateFrom: 'Date from',
    dateTo: 'Date to',
    orderId: 'Order ID',
    date: 'Date',
    total: 'Total',
    actions: 'Actions',
    unknown: 'Unknown',

    // traducciones de analíticas
    analyticsTitle: 'Analytics',
    analyticsDescription: 'Detailed analysis of your business performance',
    exportReport: 'Export Report',
    monthlySales: 'Monthly Sales',
    salesTrend: 'Sales Trend',
    growth: 'Growth',
    conversion: 'Conversion',
    retention: 'Retention',

    // traducciones de login
    loginTitle: 'Login',
    testCredentials: 'Test credentials:',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot your password?',
    loginButton: 'Login'
  }
}

const SettingsContext = createContext()

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

const DEFAULT_SETTINGS = { language: 'es', darkMode: true, notifications: true, sessionDuration: 5 }

const getSettingsKey = (userId) => userId ? `appSettings_${userId}` : 'appSettings'

const readSettings = (userId) => {
  try {
    const saved = localStorage.getItem(getSettingsKey(userId))
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (!parsed.sessionDuration) parsed.sessionDuration = 5
    return parsed
  } catch {
    return null
  }
}

export const SettingsProvider = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState(null)
  const [settings, setSettings] = useState(() => readSettings(null) || DEFAULT_SETTINGS)

  // Guardar configuración en localStorage cuando cambie (con la clave del usuario activo)
  useEffect(() => {
    localStorage.setItem(getSettingsKey(currentUserId), JSON.stringify(settings))
  }, [settings, currentUserId])

  // Aplicar tema oscuro/claro al body
  useEffect(() => {
    if (settings.darkMode) {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
      document.body.classList.remove('dark')
    }
  }, [settings.darkMode])

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const updateLanguage = (language) => {
    setSettings(prev => ({ ...prev, language }))
    // Aplicar el idioma inmediatamente
    document.documentElement.lang = language
    console.log('Idioma cambiado a:', language)
  }

  const toggleDarkMode = () => {
    setSettings(prev => {
      const newMode = !prev.darkMode;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ theme_preference: newMode ? 'dark' : 'light' })
        }).catch(() => {});
      }
      return { ...prev, darkMode: newMode };
    });
  }

  const updateNotifications = (notifications) => {
    setSettings(prev => ({ ...prev, notifications }))
  }

  const updateSessionDuration = (duration) => {
    setSettings(prev => ({ ...prev, sessionDuration: duration }))
    // actualizamos también userSettings para que lo use AuthContext
    const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    userSettings.sessionDuration = duration
    localStorage.setItem('userSettings', JSON.stringify(userSettings))
  }

  const loadSettingsForUser = useCallback((userId) => {
    setCurrentUserId(userId || null)
    const saved = readSettings(userId)
    if (saved) setSettings(saved)
  }, [])

  const resetToAnonymous = useCallback(() => {
    setCurrentUserId(null)
    const saved = readSettings(null)
    setSettings(saved || DEFAULT_SETTINGS)
  }, [])

  // Función para obtener traducciones
  const t = (key) => {
    return translations[settings.language]?.[key] || key
  }

  // Aplicar idioma al documento
  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  const value = {
    settings,
    updateSettings,
    updateLanguage,
    toggleDarkMode,
    updateNotifications,
    updateSessionDuration,
    loadSettingsForUser,
    resetToAnonymous,
    t // función de traducción
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}