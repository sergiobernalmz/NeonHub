import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  X,
  Leaf,
  Users,
  FileText,
  TrendingUp,
  UserCog,
  Image,
  Award,
  ChevronRight,
  LogOut,
  MessageSquare,
  Receipt,
  RotateCcw,
  Tag,
  ArrowLeftRight
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'
import { useLanguage } from '../../context/LanguageContext'
import { useConfig } from '../../context/ConfigContext'
import { useState, useEffect } from 'react'

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation()
  const { user, logout, changeStore } = useAuth()
  const { t } = useLanguage()
  const config = useConfig()

  // miramos si el usuario tiene rol CEO
  const isCEO = user?.roles?.some(role =>
    role.name === 'ceo' || role.level >= 100
  );

  const userLevel = user?.roles?.reduce((max, r) => Math.max(max, r.level || 0), 0) ?? 0
  const storeFeatures = config?.features || {}
  const userPermissions = user?.userPermissions || {}

  const allMenuItems = [
    { name: t('dashboard'), icon: Home, path: ROUTES.DASHBOARD, color: 'from-blue-400 to-cyan-300' },
    { name: t('products'), icon: Package, path: ROUTES.DASHBOARD_PRODUCTS, color: 'from-purple-400 to-pink-300', featureKey: 'products' },
    { name: t('imageGallery'), icon: Image, path: ROUTES.DASHBOARD_GALLERY, color: 'from-pink-400 to-rose-300', featureKey: 'gallery' },
    { name: t('orders'), icon: ShoppingCart, path: ROUTES.DASHBOARD_ORDERS, color: 'from-orange-400 to-amber-300', featureKey: 'orders' },
    { name: t('analytics'), icon: BarChart3, path: ROUTES.DASHBOARD_ANALYTICS, color: 'from-yellow-400 to-orange-300', featureKey: 'analytics' },
    { name: t('customers'), icon: Users, path: ROUTES.DASHBOARD_CUSTOMERS, color: 'from-blue-400 to-indigo-300', minLevel: 60, featureKey: 'customers' },
    { name: t('tickets'), icon: MessageSquare, path: ROUTES.DASHBOARD_TICKETS, color: 'from-blue-400 to-cyan-300', featureKey: 'tickets', minLevel: 60 },
    { name: t('invoices'), icon: Receipt, path: ROUTES.DASHBOARD_INVOICES, color: 'from-emerald-400 to-teal-300', featureKey: 'invoices', minLevel: 60 },
    { name: t('returns'), icon: RotateCcw, path: ROUTES.DASHBOARD_RETURNS, color: 'from-rose-400 to-pink-300', featureKey: 'orders', minLevel: 60 },
    { name: t('discounts'), icon: Tag, path: ROUTES.DASHBOARD_DISCOUNTS, color: 'from-teal-400 to-cyan-300', featureKey: 'discounts', minLevel: 60 },
    ...(isCEO ? [
      { name: t('userManagement'), icon: UserCog, path: ROUTES.DASHBOARD_USERS, color: 'from-red-400 to-rose-300' },
    ] : []),
    { name: t('incidencias'), icon: FileText, path: ROUTES.DASHBOARD_REPORTS, color: 'from-cyan-400 to-blue-300', featureKey: 'reports' },
    { name: t('certifications'), icon: Award, path: ROUTES.DASHBOARD_CERTIFICATIONS, color: 'from-amber-400 to-orange-300', featureKey: 'certifications', minLevel: 80 },
    { name: t('sustainability'), icon: Leaf, path: ROUTES.DASHBOARD_SUSTAINABILITY, color: 'from-green-400 to-emerald-300', minLevel: 60, featureKey: 'sustainability' },
    { name: t('settings'), icon: Settings, path: ROUTES.DASHBOARD_SETTINGS, color: 'from-gray-400 to-slate-300' }
  ]

  const menuItems = allMenuItems.filter(item => {
    const hasLevel = !item.minLevel || userLevel >= item.minLevel
    const isStoreEnabled = !item.featureKey || storeFeatures[item.featureKey] === true
    const isUserEnabled = !item.featureKey || userPermissions[item.featureKey] !== false
    return hasLevel && isStoreEnabled && isUserEnabled
  })

  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => setIsDesktop(window.innerWidth >= 1024)
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const animateState = isDesktop ? 'open' : (isOpen ? 'open' : 'closed')

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen || isDesktop ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-72 border-r border-gray-800/50 shadow-2xl lg:translate-x-0 overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-blue-500/10 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-purple-500/10 rounded-full blur-3xl opacity-50"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-8">
            <motion.div
              className="flex items-center space-x-3 group"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                {config?.dashboard_logo || config?.logo ? (
                  <img src={config.dashboard_logo || config.logo} alt="Logo"
                    style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {(config?.dashboardName || config?.name || 'N').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{config?.dashboardName || config?.name || 'NeonHub'}</h1>
              </div>
            </motion.div>

            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Mini-Card */}
          <div className="px-4 mb-6">
            <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-md group hover:border-gray-700/50 transition-colors duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="font-bold text-white text-sm">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-blue-400 truncate">{user?.role || 'Administrador'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden pb-4">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">{t('sidebarMenuLabel')}</h3>
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`relative group flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-gray-800/80 text-white shadow-lg shadow-black/20' : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabOutline"
                      className="absolute inset-0 rounded-xl z-[-1]"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b ${item.color} shadow-[0_0_12px_rgba(59,130,246,0.5)]`}></div>
                  )}

                  <Icon
                    className={`w-5 h-5 mr-3 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}
                  />

                  <span className={`text-sm font-medium tracking-wide ${isActive ? 'text-white' : ''}`}>{item.name}</span>

                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-auto"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${item.color}`}></div>
                    </motion.div>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Cambiar tienda — solo visible en Electron */}
          {window.electron?.isElectron && (
            <div className="px-4 pb-3 border-t border-gray-800/50 pt-3">
              <button
                onClick={changeStore}
                className="relative group flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:bg-blue-500/10 hover:text-blue-300"
              >
                <ArrowLeftRight className="w-5 h-5 mr-3 text-gray-500 group-hover:text-blue-400" />
                <span className="text-sm font-medium tracking-wide">{t('changeStore')}</span>
              </button>
            </div>
          )}

          {/* Footer Stats / Impact Card — solo si sostenibilidad está activo */}
          {config?.features?.sustainability === true && (
            <div className="p-4 mt-auto border-t border-gray-800/50 bg-gray-900/30">
              <div className="relative overflow-hidden rounded-2xl p-4 group" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+12%</span>
                </div>
                <div className="relative z-10">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">{t('monthlyImpact')}</p>
                  <p className="text-lg font-bold text-white tracking-tight">2.4 ton <span className="text-xs text-gray-400 font-normal">CO₂</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  )
}

export default Sidebar