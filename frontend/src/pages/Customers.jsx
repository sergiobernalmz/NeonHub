import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import customerService from '../services/customerService'
import { Search, Users, Building2, UserRound, Mail, Phone, BadgePercent, FileText, X } from 'lucide-react'

const Customers = () => {
  const { showError, showSuccess } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', type: '' })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    load()
  }, [filters, pagination.page])

  const load = async () => {
    try {
      setLoading(true)
      const { data, success } = await customerService.list({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        type: filters.type
      })
      if (success) {
        setItems(data.customers)
        setPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }))
      }
    } catch (e) {
      console.error(e)
      showError(e.message || 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (c) => {
    try {
      await customerService.setStatus(c.id, !c.isActive)
      showSuccess(!c.isActive ? t('customerActivated') : t('customerDeactivated'))
      load()
    } catch (e) {
      showError(e.message)
    }
  }

  const rows = useMemo(() => items, [items])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2"><Users className="w-7 h-7 text-pink-400"/> {t('customersTitle')}</h1>
          <p className="text-gray-400">{t('customersStoreSubtitle')}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
          <p className="text-sm text-blue-300">💡 {t('customersCreateHint')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('searchCustomersPlaceholder')}
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPagination(p => ({ ...p, page: 1 })) }}
            />
          </div>
          <select
            className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPagination(p => ({ ...p, page: 1 })) }}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          <div className="flex items-center gap-2 justify-end col-span-2">
            <span className="text-sm text-gray-400">{pagination.total} {t('customersRegistered')}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">{t('loadingCustomers')}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('noCustomersFound')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('customer')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('email')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('orders')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('total')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rows.map(c => (
                  <tr key={c.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center font-bold">
                          {(c.firstName || c.username || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            <UserRound className="w-4 h-4"/> {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                          </div>
                          <div className="text-xs text-gray-400">@{c.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1"><Mail className="w-4 h-4"/>{c.email}</div>
                        {c.phone && <div className="flex items-center gap-1"><Phone className="w-4 h-4"/>{c.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400"/>
                        <span className="font-medium">{c.totalOrders || 0}</span>
                        <span className="text-gray-500">pedidos</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="text-green-400 font-medium">
                        €{Number(c.totalSpent || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {c.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(c)} className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center gap-1">
                          <FileText className="w-4 h-4"/> {t('see')}
                        </button>
                        <button onClick={() => toggleStatus(c)} className={`px-3 py-1 text-xs rounded ${c.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                          {c.isActive ? t('deactivate') : t('activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page === 1} className="px-3 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50">Anterior</button>
              <span className="text-sm text-gray-300">Página {pagination.page} de {pagination.totalPages}</span>
              <button onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))} disabled={pagination.page === pagination.totalPages} className="px-3 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Detalle de Cliente</h3>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-700"><X className="w-5 h-5 text-gray-300"/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-200">
                <div>
                  <div className="text-sm text-gray-400">Código</div>
                  <div className="font-medium">{selected.customerCode}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Tipo</div>
                  <div className="font-medium">{selected.customerType === 'business' ? 'Empresa' : 'Particular'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Nombre</div>
                  <div className="font-medium">{[selected.firstName, selected.lastName].filter(Boolean).join(' ')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Empresa</div>
                  <div className="font-medium">{selected.companyName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="font-medium">{selected.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Teléfono</div>
                  <div className="font-medium">{selected.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Crédito</div>
                  <div className="font-medium">€{Number(selected.creditLimit || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Estado</div>
                  <div className="font-medium">{selected.isActive ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Customers
