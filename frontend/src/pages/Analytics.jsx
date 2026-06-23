import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Download, Users, ShoppingCart, Euro, Package } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useConfig } from '../context/ConfigContext'
import reportService from '../services/reportService'
import dashboardService from '../services/dashboardService'
import { useState, useEffect } from 'react'
import Skeleton from '../components/ui/Skeleton'

// colores para el grafico de queso
const PIE_COLORS = ['#00ff88', '#00d4ff', '#b347d9', '#ff0080', '#ffaa00', '#ff4444']

const Analytics = () => {
  const { t } = useLanguage()
  const { showSuccess, showError, showInfo } = useToast()
  const storeConfig = useConfig()

  const [exportLoading, setExportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('month')

  // pilla todos los datos del panel
  const loadData = async () => {
    setLoading(true)
    try {
      const [salesRes, catRes, statsRes] = await Promise.all([
        dashboardService.getSalesData(period),
        dashboardService.getCategoryData(),
        dashboardService.getDashboardStats()
      ])

      // aqui vienen las ventas y los pedidos
      setSalesData(Array.isArray(salesRes.data) ? salesRes.data : [])
      setCategoryData(Array.isArray(catRes.data) ? catRes.data : [])
      setStats(statsRes.data?.stats || null)
    } catch (err) {
      console.error('Error loading analytics:', err)
      showError('Error al cargar los datos de analíticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [period])

  // para sacar el informe
  const handleExportReport = async () => {
    try {
      showInfo('Generando reporte…')
      setExportLoading(true)
      const reportData = await reportService.generateReport('sales', 'quarter')

      const choice = window.prompt(
        'Selecciona el formato de exportación:\n\n' +
        '1 - CSV\n2 - JSON\n3 - Imprimir\n4 - Cancelar\n\nIngresa el número:'
      )
      switch (choice) {
        case '1': reportService.exportReportAsCSV(reportData,  'reporte_analytics', storeConfig?.name, storeConfig?.features); showSuccess('CSV descargado'); break
        case '2': reportService.exportReportAsJSON(reportData, 'reporte_analytics'); showSuccess('JSON descargado'); break
        case '3': reportService.printReport(reportData, storeConfig?.name, storeConfig?.features); showSuccess('Enviando a imprimir…'); break
        case '4': case null: showInfo('Exportación cancelada'); break
        default: showError('Opción no válida')
      }
    } catch (err) {
      console.error('Error exporting report:', err)
      showError('Error al exportar el reporte')
    } finally {
      setExportLoading(false)
    }
  }

  // funciones de ayuda
  const fmt = (n, style = 'decimal') =>
    new Intl.NumberFormat('es-ES', {
      style,
      currency: 'EUR',
      maximumFractionDigits: style === 'currency' ? 2 : 0
    }).format(n ?? 0)

  const statsCards = stats
    ? [
        { label: t('totalSales'),    value: fmt(stats.totalSales?.value,   'currency'), icon: Euro,         color: 'text-green-400',  change: stats.totalSales?.change },
        { label: t('orders'),        value: fmt(stats.totalOrders?.value),              icon: ShoppingCart,  color: 'text-blue-400',   change: stats.totalOrders?.change },
        { label: t('products'),      value: fmt(stats.totalProducts?.value),            icon: Package,       color: 'text-purple-400', change: null },
        { label: t('customers'),     value: fmt(stats.totalCustomers?.value),           icon: Users,         color: 'text-cyan-400',   change: null }
      ]
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{t('analyticsTitle')}</h1>
          <p className="text-gray-400 text-sm">{t('analyticsDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* elegir el tiempo */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="month">{t('thisMonth')}</option>
            <option value="year">{t('thisYear')}</option>
          </select>
          <button
            onClick={handleExportReport}
            disabled={exportLoading}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? t('exporting') : t('exportReport')}
          </button>
        </div>
      </div>

      {/* las tarjetitas de arriba */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)
          : statsCards.map(({ label, value, icon: Icon, color, change }) => (
            <div key={label} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{label}</p>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {change !== null && change !== undefined && (
                <p className={`text-xs mt-1 ${parseFloat(change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(change))}% {t('vsPrevMonth')}
                </p>
              )}
            </div>
          ))
        }
      </div>

      {/* los graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* graficos de barras */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('monthlySales')} <span className="text-xs text-gray-500 font-normal">(importe en €)</span></h3>
          {loading ? (
            <Skeleton className="h-64" />
          ) : salesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">{t('noDataForPeriod')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-secondary)' }} />
                <Legend formatter={() => 'Ventas (€)'} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="ventas" fill="url(#barGrad)" radius={[4,4,0,0]} name="Ventas (€)" animationDuration={800} animationEasing="ease-out" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* grafico de lineas */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('salesTrend')} <span className="text-xs text-gray-500 font-normal">(nº de pedidos)</span></h3>
          {loading ? (
            <Skeleton className="h-64" />
          ) : salesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">{t('noDataForPeriod')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-secondary)' }} />
                <Legend formatter={() => 'Pedidos (uds.)'} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Line type="monotone" dataKey="pedidos" stroke="#00ff88" strokeWidth={3} dot={{ fill: '#00ff88', r: 4 }} name="Pedidos (uds.)" animationDuration={800} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* reparto por categorias */}
      {!loading && categoryData.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('categoryDistribution')}</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width={260} height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3} animationDuration={800} animationEasing="ease-out">
                  {categoryData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-300 truncate">{cat.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default Analytics