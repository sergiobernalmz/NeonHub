import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Download, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { isDarkColor } from '../utils/colorUtils'
import CSSVariables from '../components/shop/CSSVariables'

const fmt     = (n) => `€${parseFloat(n || 0).toFixed(2)}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '-'
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')

const STATUS_LABEL = {
    paid: 'Pagada', draft: 'Borrador', sent: 'Enviada', overdue: 'Vencida', cancelled: 'Cancelada'
}

export default function ShopInvoices() {
    const config    = useConfig()
    const { user }  = useAuth()
    const navigate  = useNavigate()

    const primary    = config?.colors?.primary || '#2563eb'
    const bg         = config?.colors?.background || '#ffffff'
    const isDark     = bg !== '#ffffff'
    const textColor  = isDark ? '#f1f5f9' : '#111827'
    const mutedColor = isDark ? '#94a3b8' : '#6b7280'
    const cardStyle  = isDark
        ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
        : { background: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.08)' }

    const [invoices,    setInvoices]    = useState([])
    const [loading,     setLoading]     = useState(true)
    const [downloading, setDownloading] = useState(null)

    useEffect(() => {
        if (!user) { navigate('/login'); return }
        fetch('/api/invoices/my', {
            headers: { Authorization: `Bearer ${getToken()}` }
        })
            .then(r => r.json())
            .then(d => { if (d.success) setInvoices(d.data || []) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [user, navigate])

    const handleDownload = async (inv) => {
        setDownloading(inv.id)
        try {
            const res  = await fetch(`/api/invoices/${inv.id}/pdf-customer`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            const blob = await res.blob()
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = `factura-${inv.invoice_number}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setDownloading(null)
        }
    }

    if (!user) return null

    return (
        <div className="shop-root tenant-theme min-h-screen" style={{ background: bg }}>
            <CSSVariables config={config} />

            <div className="max-w-2xl mx-auto px-4 py-10">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-8">
                    <button onClick={() => navigate('/shop')}
                        className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
                        style={{ color: primary }}>
                        <ArrowLeft className="w-4 h-4" />
                        Tienda
                    </button>
                    <span style={{ color: mutedColor }}>›</span>
                    <span className="text-sm font-semibold" style={{ color: textColor }}>Mis facturas</span>
                </div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: textColor }}>
                        <Receipt className="w-5 h-5" style={{ color: primary }} />
                        Mis facturas
                    </h1>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-6 h-6 border-2 rounded-full animate-spin"
                                style={{ borderColor: `${primary}40`, borderTopColor: primary }} />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="rounded-2xl border p-12 text-center backdrop-blur-sm" style={cardStyle}>
                            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: textColor }} />
                            <p className="font-medium" style={{ color: textColor }}>No tienes facturas todavía</p>
                            <p className="text-sm mt-1" style={{ color: mutedColor }}>
                                Las facturas se generan automáticamente al confirmar un pedido.
                            </p>
                            <button onClick={() => navigate('/shop')}
                                className="mt-5 text-sm font-semibold px-5 py-2 rounded-lg text-white"
                                style={{ backgroundColor: primary }}>
                                Ir a la tienda
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map(inv => (
                                <motion.div
                                    key={inv.id}
                                    whileHover={{ scale: 1.005 }}
                                    className="rounded-2xl border p-5 backdrop-blur-sm flex items-center gap-4"
                                    style={cardStyle}
                                >
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: `${primary}15` }}>
                                        <Receipt className="w-5 h-5" style={{ color: primary }} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold font-mono" style={{ color: textColor }}>
                                            {inv.invoice_number}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                            <span className="text-xs" style={{ color: mutedColor }}>
                                                {fmtDate(inv.invoice_date)}
                                            </span>
                                            {inv.order && (
                                                <span className="text-xs font-mono" style={{ color: mutedColor }}>
                                                    Pedido: {inv.order.order_number}
                                                </span>
                                            )}
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: inv.status === 'paid' ? `rgba(34,197,94,0.15)` : `rgba(100,116,139,0.15)`,
                                                    color: inv.status === 'paid' ? '#16a34a' : '#64748b'
                                                }}>
                                                {STATUS_LABEL[inv.status] || inv.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <p className="font-bold text-lg flex-shrink-0" style={{ color: textColor }}>
                                        {fmt(inv.total_amount)}
                                    </p>

                                    {/* Download */}
                                    <button
                                        onClick={() => handleDownload(inv)}
                                        disabled={downloading === inv.id}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
                                        style={{
                                            backgroundColor: primary,
                                            color: isDarkColor(primary) ? '#fff' : '#000'
                                        }}
                                    >
                                        {downloading === inv.id
                                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <Download className="w-4 h-4" />
                                        }
                                        PDF
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
