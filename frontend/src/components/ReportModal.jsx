import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Download, Calendar, Filter, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const ReportModal = ({ isOpen, onClose, onGenerate, loading = false }) => {
  const { t } = useLanguage()
  const [reportType, setReportType] = useState('general')
  const [dateRange, setDateRange] = useState('month')
  const [exportFormat, setExportFormat] = useState('csv')
  const [includeCharts, setIncludeCharts] = useState(true)

  const reportTypes = [
    {
      id: 'general',
      name: 'Reporte General',
      description: 'Vista completa del dashboard',
      icon: BarChart3,
      color: 'text-blue-400'
    },
    {
      id: 'sales',
      name: 'Reporte de Ventas',
      description: 'Análisis detallado de ventas',
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      id: 'products',
      name: 'Reporte de Productos',
      description: 'Estadísticas de productos',
      icon: PieChart,
      color: 'text-purple-400'
    },
    {
      id: 'sustainability',
      name: 'Reporte de Sostenibilidad',
      description: 'Métricas ambientales',
      icon: FileText,
      color: 'text-emerald-400'
    }
  ]

  const dateRanges = [
    { id: 'week', name: 'Última Semana' },
    { id: 'month', name: 'Último Mes' },
    { id: 'quarter', name: 'Último Trimestre' },
    { id: 'year', name: 'Último Año' },
    { id: 'custom', name: 'Rango Personalizado' }
  ]

  const exportFormats = [
    { id: 'csv', name: 'CSV', description: 'Ideal para Excel' },
    { id: 'json', name: 'JSON', description: 'Datos estructurados' },
    { id: 'pdf', name: 'PDF', description: 'Documento visual' }
  ]

  const handleGenerate = () => {
    const config = {
      type: reportType,
      dateRange,
      format: exportFormat,
      includeCharts
    }
    onGenerate(config)
  }

  const handleReset = () => {
    setReportType('general')
    setDateRange('month')
    setExportFormat('csv')
    setIncludeCharts(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Generar Reporte</h2>
                  <p className="text-sm text-gray-400">Configura y exporta reportes personalizados</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Tipo de Reporte */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Tipo de Reporte
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setReportType(type.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          reportType === type.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                        }`}
                        disabled={loading}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-5 h-5 mt-1 ${type.color}`} />
                          <div>
                            <div className="font-medium text-white">{type.name}</div>
                            <div className="text-sm text-gray-400">{type.description}</div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Rango de Fechas */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Rango de Fechas
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dateRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setDateRange(range.id)}
                      className={`p-3 rounded-lg border transition-all text-sm ${
                        dateRange === range.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                      }`}
                      disabled={loading}
                    >
                      {range.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formato de Exportación */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  <Download className="w-4 h-4 inline mr-2" />
                  Formato de Exportación
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {exportFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        exportFormat === format.id
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      disabled={loading}
                    >
                      <div className="font-medium text-white">{format.name}</div>
                      <div className="text-sm text-gray-400">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones Adicionales */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Opciones Adicionales
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      disabled={loading}
                    />
                    <span className="text-gray-300">Incluir gráficos y visualizaciones</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Vista Previa de la Configuración</h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>• Tipo: {reportTypes.find(t => t.id === reportType)?.name}</div>
                  <div>• Período: {dateRanges.find(d => d.id === dateRange)?.name}</div>
                  <div>• Formato: {exportFormats.find(f => f.id === exportFormat)?.name}</div>
                  <div>• Gráficos: {includeCharts ? 'Incluidos' : 'No incluidos'}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                Restablecer
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar Reporte
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ReportModal