import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Download, Search, ChevronDown, TrendingUp, FileText, Euro } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

const fmt = (n) => `€${parseFloat(n || 0).toFixed(2)}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '-'

const STATUS_CFG = {
    paid:      { labelKey: 'invoicePaid',      bg: 'rgba(34,197,94,0.12)',   color: '#16a34a', border: 'rgba(34,197,94,0.3)'   },
    draft:     { labelKey: 'invoiceDraft',     bg: 'rgba(100,116,139,0.12)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },
    sent:      { labelKey: 'invoiceSent',      bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', border: 'rgba(59,130,246,0.3)'  },
    overdue:   { labelKey: 'invoiceOverdue',   bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
    cancelled: { labelKey: 'invoiceCancelled', bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', border: 'rgba(156,163,175,0.3)' },
}

function StatusBadge({ status, t }) {
    const s = STATUS_CFG[status] || STATUS_CFG.draft
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
            style={{ background: s.bg, color: s.color, borderColor: s.border }}>
            {t ? t(s.labelKey) : s.labelKey}
        </span>
    )
}

const downloadPDF = async (invoiceId, invoiceNumber) => {
    const res   = await fetch(`/api/invoices/${invoiceId}/pdf`, { headers: authHeaders() })
    const blob  = await res.blob()
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `factura-${invoiceNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
}

export default function Invoices() {
    const { t } = useLanguage()
    const [invoices,    setInvoices]    = useState([])
    const [stats,       setStats]       = useState({ total: 0, this_month: 0, count: 0 })
    const [loading,     setLoading]     = useState(true)
    const [downloading, setDownloading] = useState(null)
    const [search,      setSearch]      = useState('')
    const [statusFilter,setStatusFilter]= useState('')
    const [fromDate,    setFromDate]    = useState('')
    const [toDate,      setToDate]      = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (statusFilter) params.set('status', statusFilter)
            if (fromDate)     params.set('from', fromDate)
            if (toDate)       params.set('to', toDate)

            const [invRes, statsRes] = await Promise.all([
                fetch(`/api/invoices?${params}`, { headers: authHeaders() }),
                fetch('/api/invoices/stats',      { headers: authHeaders() }),
            ])
            const invData   = await invRes.json()
            const statsData = await statsRes.json()
            if (invData.success)   setInvoices(invData.data || [])
            if (statsData.success) setStats(statsData.data)
        } catch (err) {
            console.error('Error loading invoices:', err)
        } finally {
            setLoading(false)
        }
    }, [statusFilter, fromDate, toDate])

    useEffect(() => { fetchData() }, [fetchData])

    const filtered = invoices.filter(inv => {
        if (!search) return true
        const q = search.toLowerCase()
        const customer = inv.customer
        return (
            inv.invoice_number?.toLowerCase().includes(q) ||
            inv.order?.order_number?.toLowerCase().includes(q) ||
            customer?.email?.toLowerCase().includes(q) ||
            [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').toLowerCase().includes(q)
        )
    })

    const handleDownload = async (inv) => {
        setDownloading(inv.id)
        try { await downloadPDF(inv.id, inv.invoice_number) }
        finally { setDownloading(null) }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                    <Receipt className="w-8 h-8 text-blue-400" />
                    {t('invoicesTitle')}
                </h1>
                <p className="text-gray-400">{t('invoicesDescription')}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: t('totalBilled'), value: fmt(stats.total), icon: Euro,       color: 'text-green-400' },
                    { label: t('thisMonth'),   value: fmt(stats.this_month), icon: TrendingUp, color: 'text-blue-400'  },
                    { label: t('invoiceCount'), value: stats.count,     icon: FileText,   color: 'text-violet-400'},
                ].map(s => (
                    <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 flex items-center gap-4">
                        <s.icon className={`w-8 h-8 ${s.color}`} />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                            <p className="text-2xl font-bold text-white">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchInvoices')}
                        className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                    />
                </div>
                <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer">
                        <option value="">{t('allStatuses')}</option>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                            <option key={k} value={k}>{t(v.labelKey)}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No hay facturas{search ? ' que coincidan con la búsqueda' : ' todavía'}.</p>
                        {!search && <p className="text-gray-500 text-sm mt-1">Se generan automáticamente al confirmar un pedido.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700/50">
                                    {[t('invoiceNumber'), t('customer'), t('orderId'), t('date'), t('total'), t('status'), ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/30">
                                {filtered.map(inv => {
                                    const customer = inv.customer
                                    return (
                                        <tr key={inv.id} className="hover:bg-gray-700/20 transition-colors">
                                            <td className="px-4 py-3 font-mono text-blue-400 font-medium whitespace-nowrap">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-white font-medium">
                                                    {customer ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '-' : '-'}
                                                </p>
                                                <p className="text-gray-400 text-xs">{customer?.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                                                {inv.order?.order_number || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                                                {fmtDate(inv.invoice_date)}
                                            </td>
                                            <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">
                                                {fmt(inv.total_amount)}
                                                {parseFloat(inv.discount_amount || 0) > 0 && (
                                                    <span style={{
                                                        background: 'rgba(34,197,94,0.15)',
                                                        color: '#22c55e',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        marginLeft: '6px'
                                                    }}>
                                                        🏷️ -€{parseFloat(inv.discount_amount).toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={inv.status} t={t} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDownload(inv)}
                                                    disabled={downloading === inv.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {downloading === inv.id
                                                        ? <div className="w-3.5 h-3.5 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                                                        : <Download className="w-3.5 h-3.5" />
                                                    }
                                                    {t('downloadPDF')}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
