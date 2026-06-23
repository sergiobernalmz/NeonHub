import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../constants/routes'
import { useLanguage } from '../context/LanguageContext'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useConfig } from '../context/ConfigContext'
import dashboardService from '../services/dashboardService'
import reportService from '../services/reportService'
import { useToast } from '../context/ToastContext'
import ReportModal from '../components/ReportModal'
import OnboardingPending from '../components/OnboardingPending'
import gsap from 'gsap'
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Leaf,
  Zap,
  Droplets,
  Recycle,
  ShoppingBag,
  Tag
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const AnimatedCounter = ({ value, prefix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(
    prefix + (0).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  )
  const objRef = useRef({ val: 0 })

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(prefix + value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
      return
    }
    const obj = objRef.current
    const tween = gsap.to(obj, {
      val: value,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => setDisplay(
        prefix + obj.val.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      )
    })
    return () => tween.kill()
  }, [value])

  return <span>{display}</span>
}

const Dashboard = () => {
  const { user } = useAuth() // desestructuramos el usuario del contexto
  const config = useConfig()

  // Helper para comprobar si una sección está activa
  const isSectionActive = (key) => config?.sections?.[key] !== false;
  const hasAnalytics = config?.features?.analytics !== false;
  const hasSustainability = config?.features?.sustainability !== false;
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { showError, showSuccess, showInfo } = useToast()

  // Estados para datos del dashboard
  const [loading, setLoading] = useState(true)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [rawStatsData, setRawStatsData] = useState(null)

  const stats = useMemo(() => {
    if (!rawStatsData) return []
    const s = rawStatsData
    return [
      {
        title: t('totalSales'),
        value: `€${parseFloat(s.totalSales.value).toLocaleString('es-ES', { minimumFractionDigits: 0 })}`,
        rawValue: parseFloat(s.totalSales.value) || 0,
        prefix: '€',
        decimals: 0,
        change: `${s.totalSales.change >= 0 ? '+' : ''}${s.totalSales.change}%`,
        trend: s.totalSales.trend,
        icon: DollarSign,
        color: 'text-green-400'
      },
      {
        title: t('orders'),
        value: s.totalOrders.value.toLocaleString('es-ES'),
        rawValue: s.totalOrders.value || 0,
        prefix: '',
        decimals: 0,
        change: `${s.totalOrders.change >= 0 ? '+' : ''}${s.totalOrders.change}%`,
        trend: s.totalOrders.trend,
        icon: ShoppingCart,
        color: 'text-blue-400'
      },
      {
        title: t('products'),
        value: s.totalProducts.value.toLocaleString('es-ES'),
        rawValue: s.totalProducts.value || 0,
        prefix: '',
        decimals: 0,
        change: `${s.totalProducts.change >= 0 ? '+' : ''}${s.totalProducts.change}%`,
        trend: s.totalProducts.trend,
        icon: Package,
        color: 'text-purple-400'
      },
      {
        title: t('customers'),
        value: s.totalCustomers.value.toLocaleString('es-ES'),
        rawValue: s.totalCustomers.value || 0,
        prefix: '',
        decimals: 0,
        change: `${s.totalCustomers.change >= 0 ? '+' : ''}${s.totalCustomers.change}%`,
        trend: s.totalCustomers.trend,
        icon: Users,
        color: 'text-yellow-400'
      },
      ...(config?.features?.discounts && s.discounts ? [{
        title: t('discountsThisMonth'),
        value: `${s.discounts.orders_with_discount} pedidos`,
        change: `€${s.discounts.total_discounted} descontados`,
        trend: 'up',
        icon: Tag,
        color: 'text-green-400'
      }] : [])
    ]
  }, [rawStatsData, language])

  const [salesData, setSalesData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [sustainabilityMetrics, setSustainabilityMetrics] = useState(null)
  const [dashboardData, setDashboardData] = useState({})

  // Cargar datos del dashboard y refrescar cada 5 minutos
  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Si el usuario tiene un plan pendiente, mostrar onboarding
  if (user?.preferences?.onboarding_status === 'pending_payment') {
    return <OnboardingPending />;
  }

  const withTimeout = (promise, ms = 10000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Cargar todas las estadísticas en paralelo con timeout individual de 10s
      const [
        statsResponse,
        salesResponse,
        categoryResponse,
        ordersResponse,
        sustainabilityResponse
      ] = await Promise.all([
        withTimeout(dashboardService.getDashboardStats()),
        withTimeout(dashboardService.getSalesData()),
        withTimeout(dashboardService.getCategoryData()),
        withTimeout(dashboardService.getRecentOrders()),
        withTimeout(dashboardService.getSustainabilityMetrics())
      ])

      // Procesar estadísticas principales
      if (statsResponse.success) {
        setRawStatsData(statsResponse.data.stats)
      }

      // Procesar datos de ventas
      if (salesResponse.success) {
        setSalesData(salesResponse.data)
      }

      // Procesar datos de categorías
      if (categoryResponse.success) {
        setCategoryData(categoryResponse.data)
      }

      // Procesar pedidos recientes
      if (ordersResponse.success) {
        setRecentOrders(ordersResponse.data)
      }

      // Procesar métricas de sostenibilidad
      if (sustainabilityResponse.success) {
        const sustainabilityData = sustainabilityResponse.data
        setSustainabilityMetrics(sustainabilityData)
      }

      // Crear objeto dashboardData para compatibilidad
      setDashboardData({
        salesData: salesResponse.success ? salesResponse.data : [],
        categoryData: categoryResponse.success ? categoryResponse.data : [],
        recentOrders: ordersResponse.success ? ordersResponse.data : [],
        sustainabilityData: sustainabilityResponse.success ? sustainabilityResponse.data : null
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      showError('Error al cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (reportConfig) => {
    try {
      showInfo('Generando reporte...')
      setLoading(true)

      const storeName = config?.name || ''
      const storeFeatures = config?.features || {}
      const reportData = await reportService.generateReport(reportConfig.type, reportConfig.dateRange)
      console.log('[DEBUG] reportData:', JSON.stringify(reportData, null, 2))
      console.log('[DEBUG] storeName:', storeName, '| features:', storeFeatures)
      const filename = `reporte_${reportConfig.type}_${reportConfig.dateRange}`
      const pdfConfig = { ...reportConfig, storeName, features: storeFeatures }

      // Exportar según el formato seleccionado
      switch (reportConfig.format) {
        case 'csv':
          reportService.exportReportAsCSV(reportData, filename, storeName, storeFeatures)
          showSuccess('Reporte CSV descargado exitosamente')
          break
        case 'json':
          reportService.exportReportAsJSON(reportData, filename)
          showSuccess('Reporte JSON descargado exitosamente')
          break
        case 'pdf':
          reportService.exportReportAsPDF(reportData, pdfConfig, filename)
          showSuccess('Reporte PDF generado exitosamente')
          break
        default:
          reportService.exportReportAsCSV(reportData, filename, storeName, storeFeatures)
          showSuccess('Reporte CSV descargado exitosamente')
      }

      setIsReportModalOpen(false)

    } catch (error) {
      console.error('Error generating report:', error)
      showError('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  }

  const trialDaysLeft = config?.trial_ends_at
    ? Math.ceil((new Date(config.trial_ends_at) - Date.now()) / 86400000)
    : 0;
  const trialDaysTotal = config?.trial_days_total || null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Banner trial */}
      {config?.trial_active && trialDaysLeft > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '14px',
          color: '#fff',
        }}>
          <span>🎉 {t('trialBanner')} <strong>{trialDaysLeft}{trialDaysTotal ? `/${trialDaysTotal}` : ''} {trialDaysLeft === 1 ? t('dayRemaining') : t('daysRemaining')}</strong></span>
          <a href="https://neonhub.es/precios" target="_blank" rel="noreferrer" style={{
            background: '#fff', color: '#7c3aed',
            padding: '6px 16px', borderRadius: '8px',
            fontWeight: 700, textDecoration: 'none',
            fontSize: '13px', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {t('activatePlan')}
          </a>
        </div>
      )}

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('dashboardTitle')}</h1>
          <p className="text-gray-400">{t('dashboardDescription')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button
            onClick={() => window.open('/shop', '_blank')}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t('viewStore')}
          </button>
          <button
            onClick={() => setIsReportModalOpen(true)}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('generating') : t('generateReport')}
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {isSectionActive('mainStats') && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded mb-2"></div>
                    <div className="h-8 bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 bg-gray-600 rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-600 rounded-xl"></div>
                </div>
              </div>
            ))
          ) : (
            stats.map((stat, _index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.title}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-200">
                        {stat.rawValue !== undefined
                          ? <AnimatedCounter value={stat.rawValue} prefix={stat.prefix || ''} decimals={stat.decimals || 0} />
                          : stat.value
                        }
                      </p>
                      <div className="flex items-center mt-2">
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                        )}
                        <span className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gray-700/30`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      )}

      {/* Charts Row */}
      {hasAnalytics && isSectionActive('charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">{t('salesVsEco')}</h3>
            {loading ? (
              <div className="h-[300px] bg-gray-700/50 animate-pulse rounded-lg flex items-center justify-center">
                <div className="text-gray-400">{t('loadingSalesData')}</div>
              </div>
            ) : salesData && salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="name" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stackId="1"
                    stroke="#00d4ff"
                    fill="#00d4ff"
                    fillOpacity={0.3}
                    name="Ventas (€)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="pedidos"
                    stackId="2"
                    stroke="#00ff88"
                    fill="#00ff88"
                    fillOpacity={0.3}
                    name="Pedidos"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-gray-700/20 rounded-lg flex items-center justify-center">
                <div className="text-gray-400">{t('noSalesData')}</div>
              </div>
            )}
          </motion.div>

          {/* Category Distribution */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">{t('categoryDistribution')}</h3>
            {loading ? (
              <div className="h-[300px] bg-gray-700/50 animate-pulse rounded-lg flex items-center justify-center">
                <div className="text-gray-400">{t('loadingCategoriesData')}</div>
              </div>
            ) : categoryData && categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {categoryData.map((entry, index) => {
                      const colors = ['#00ff88', '#00d4ff', '#b347d9', '#ff0080', '#ffff00', '#ff4444'];
                      return (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-gray-700/20 rounded-lg flex items-center justify-center">
                <div className="text-gray-400">{t('noCategoriesData')}</div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Sustainability Metrics */}
      {hasSustainability && isSectionActive('sustainability') && (
      <motion.div variants={itemVariants} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-200 mb-6">{t('sustainabilityMetrics')}</h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="p-4 bg-gray-700/50 rounded-xl animate-pulse">
                <div className="h-8 w-8 bg-gray-600 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-600 rounded mb-2"></div>
                <div className="h-6 bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        ) : sustainabilityMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-400/10 rounded-xl border border-green-400/20">
              <div className="flex items-center mb-3">
                <Leaf className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-green-400 text-sm font-medium">{t('co2Reduced')}</div>
              <div className="text-white text-2xl font-bold">{sustainabilityMetrics.co2Reduced ?? 'Sin datos'}</div>
            </div>
            <div className="p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
              <div className="flex items-center mb-3">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-yellow-400 text-sm font-medium">{t('energySaved')}</div>
              <div className="text-white text-2xl font-bold">{sustainabilityMetrics.energySaved ?? 'Sin datos'}</div>
            </div>
            <div className="p-4 bg-blue-400/10 rounded-xl border border-blue-400/20">
              <div className="flex items-center mb-3">
                <Droplets className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-blue-400 text-sm font-medium">{t('waterConserved')}</div>
              <div className="text-white text-2xl font-bold">{sustainabilityMetrics.waterConserved ?? 'Sin datos'}</div>
            </div>
            <div className="p-4 bg-purple-400/10 rounded-xl border border-purple-400/20">
              <div className="flex items-center mb-3">
                <Recycle className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-purple-400 text-sm font-medium">{t('materialRecycled')}</div>
              <div className="text-white text-2xl font-bold">{sustainabilityMetrics.materialRecycled ?? 'Sin datos'}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-700/20 rounded-xl">
              <div className="text-gray-400 text-center">No hay datos disponibles</div>
            </div>
          </div>
        )}
      </motion.div>
    )}

      {/* Recent Orders */}
      {isSectionActive('orders') && (
        <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-200">{t('recentOrders')}</h3>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD_ORDERS)}
              className="text-green-400 hover:text-blue-400 transition-colors"
            >
              {t('viewAll')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/30">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('id')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('customer')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('product')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('amount')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('status')}</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((item) => (
                  <tr key={item} className="border-b border-gray-700/20">
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-gray-600 rounded animate-pulse"></div></td>
                  </tr>
                ))
              ) : recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order, _index) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-300 font-mono">#{order.id}</td>
                    <td className="py-3 px-4 text-gray-200">{order.customerName || t('unknownCustomer')}</td>
                    <td className="py-3 px-4 text-gray-300">{order.productName || t('multipleProducts')}</td>
                    <td className="py-3 px-4 text-gray-200 font-semibold">€{parseFloat(order.totalAmount).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-400/20 text-green-400' :
                        order.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
                          order.status === 'processing' ? 'bg-blue-400/20 text-blue-400' :
                            order.status === 'shipped' ? 'bg-purple-400/20 text-purple-400' :
                              order.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                                order.status === 'cancelled' ? 'bg-red-400/20 text-red-400' :
                                  'bg-gray-400/20 text-gray-400'
                        }`}>
                        {order.status === 'completed' ? t('completed') :
                          order.status === 'pending' ? t('pending') :
                            order.status === 'processing' ? t('processing') :
                              order.status === 'shipped' ? t('shipped') :
                                order.status === 'delivered' ? t('delivered') :
                                  order.status === 'cancelled' ? t('cancelled') :
                                    order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(ROUTES.DASHBOARD_ORDERS)}
                          className="px-3 py-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                          title="Ver detalles del pedido"
                        >
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {t('see')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    {t('noRecentOrders')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </motion.div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerate={handleGenerateReport}
        loading={loading}
      />
    </motion.div>
  )
}

export default Dashboard