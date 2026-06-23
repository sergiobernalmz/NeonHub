import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, AlertCircle, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react'
import { useConfig } from '../context/ConfigContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' })

const REASON_KEYS = {
  defective: 'returnReasonDefective',
  not_as_described: 'returnReasonNotAsDescribed',
  damaged: 'returnReasonDamaged',
  wrong_item: 'returnReasonWrongItem',
  other: 'returnReasonOther'
}

const STATUS_CONFIG = {
  pending:  { labelKey: 'pending',       bg: 'rgba(234,179,8,0.15)',  color: '#eab308', icon: Clock },
  approved: { labelKey: 'returnApproved', bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', icon: CheckCircle },
  rejected: { labelKey: 'returnRejected', bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: XCircle },
  refunded: { labelKey: 'returnRefunded', bg: 'rgba(99,102,241,0.15)', color: '#6366f1', icon: CreditCard },
  closed:   { labelKey: 'returnClosed',   bg: 'rgba(107,114,128,0.15)',color: '#6b7280', icon: XCircle }
}

const Returns = () => {
  const config = useConfig()
  const { showSuccess, showError, showInfo } = useToast()
  const { t } = useLanguage()
  const primaryColor = config?.colors?.primary || '#6366f1'

  const [returns, setReturns] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, refunded: 0, totalRefunded: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [adminComment, setAdminComment] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, returnId: null, type: null })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/returns/stats', { headers: authHeaders() })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch (_) {}
  }, [])

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 100 })
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/returns?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        setReturns(data.data)
        if (selected) {
          const updated = data.data.find(r => r.id === selected.id)
          if (updated) setSelected(updated)
        }
      }
    } catch (_) {
      showError(t('noReturns'))
    } finally {
      setLoading(false)
    }
  }, [filter]) // eslint-disable-line

  useEffect(() => {
    fetchStats()
    fetchReturns()
  }, [fetchStats, fetchReturns])

  const handleApprove = (returnId) => {
    if (!adminComment.trim()) {
      showInfo(t('addCommentBeforeApprove'))
      return
    }
    setConfirmModal({ open: true, returnId, type: 'approve' })
  }

  const handleReject = (returnId) => {
    if (!adminComment.trim()) {
      showInfo(t('rejectReasonRequired'))
      return
    }
    setConfirmModal({ open: true, returnId, type: 'reject' })
  }

  const confirmAction = async () => {
    const { returnId, type } = confirmModal
    setActionLoading(true)
    try {
      const res = await fetch(`/api/returns/${returnId}/${type === 'approve' ? 'approve' : 'reject'}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ admin_comment: adminComment })
      })
      const data = await res.json()
      if (data.success) {
        showSuccess(type === 'approve' ? t('returnRefunded') : t('returnRejected'))
        setConfirmModal({ open: false, returnId: null, type: null })
        setAdminComment('')
        fetchStats()
        fetchReturns()
      } else {
        showError(data.message || 'Error al procesar la acción')
      }
    } catch (_) {
      showError('Error de conexión')
    } finally {
      setActionLoading(false)
    }
  }

  const formatAmount = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0)
  const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  const filterTabs = [
    { key: '', label: t('all'), count: stats.total },
    { key: 'pending', label: t('pending'), count: stats.pending },
    { key: 'refunded', label: t('returnApproved'), count: stats.refunded },
    { key: 'rejected', label: t('returnRejected'), count: stats.rejected }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={20} style={{ color: primaryColor }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('returnsTitle')}</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-hint)' }}>{t('returnsDescription')}</p>
        </div>
      </div>

      {/* estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: t('pending'), value: stats.pending, color: '#eab308' },
          { label: t('returnApproved'), value: stats.refunded, color: '#22c55e' },
          { label: t('returnRejected'), value: stats.rejected, color: '#ef4444' },
          { label: t('totalRefunded'), value: formatAmount(stats.totalRefunded), color: primaryColor }
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* diseño en dos columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>

        {/* izquierda: lista */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' }}>
          {/* pestañas de filtro */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                  background: filter === tab.key ? 'var(--bg-primary)' : 'transparent',
                  color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-hint)',
                  fontSize: '12px', fontWeight: 600,
                  borderBottom: filter === tab.key ? `2px solid ${primaryColor}` : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ marginLeft: '4px', background: filter === tab.key ? primaryColor : 'var(--border-primary)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* elementos de la lista */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-hint)' }}>{t('loading')}</div>
            ) : returns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-hint)' }}>
                <RotateCcw size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>{t('noReturns')}</p>
              </div>
            ) : (
              returns.map(ret => {
                const sc = STATUS_CONFIG[ret.status] || STATUS_CONFIG.pending
                const StatusIcon = sc.icon
                const isSelected = selected?.id === ret.id
                return (
                  <motion.div
                    key={ret.id}
                    onClick={() => { setSelected(ret); setAdminComment(ret.admin_comment || '') }}
                    whileHover={{ backgroundColor: 'var(--bg-primary)' }}
                    style={{
                      padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                      background: isSelected ? 'var(--bg-primary)' : 'transparent',
                      borderLeft: isSelected ? `3px solid ${primaryColor}` : '3px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {[ret.customer?.first_name, ret.customer?.last_name].filter(Boolean).join(' ')}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-hint)' }}>{ret.customer?.email}</p>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: sc.bg, color: sc.color, borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <StatusIcon size={11} /> {t(sc.labelKey)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{ret.order?.order_number}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{t(REASON_KEYS[ret.reason]) || ret.reason}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatAmount(ret.refund_amount)}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)' }}>{formatDate(ret.created_at)}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* derecha: detalle */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden', minHeight: '300px' }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-hint)' }}>
              <RotateCcw size={40} style={{ marginBottom: '12px', opacity: 0.2 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>{t('selectReturn')}</p>
            </div>
          ) : (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* cabecera del detalle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {[selected.customer?.first_name, selected.customer?.last_name].filter(Boolean).join(' ')}
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-hint)' }}>{selected.customer?.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(selected.refund_amount)}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-hint)' }}>Pedido #{selected.order?.order_number}</p>
                </div>
              </div>

              {/* filas de información */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: t('returnReason'), value: t(REASON_KEYS[selected.reason]) || selected.reason },
                  { label: t('type'), value: selected.refund_type === 'exchange' ? t('exchangeType') : t('returnTypeRefund') },
                  { label: t('status'), value: t(STATUS_CONFIG[selected.status]?.labelKey || '') || selected.status },
                  { label: t('date'), value: formatDate(selected.created_at) }
                ].map(row => (
                  <div key={row.label} style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.value}</p>
                  </div>
                ))}
              </div>

              {/* descripción del cliente */}
              {selected.description && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('customerDescription')}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{selected.description}</p>
                </div>
              )}

              {/* acciones del admin o estado resuelto */}
              {selected.status === 'pending' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {t('adminComment')} {selected.status === 'pending' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <textarea
                      value={adminComment}
                      onChange={e => setAdminComment(e.target.value)}
                      placeholder="Escribe el motivo de tu decisión..."
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                        background: 'var(--bg-primary)', border: '1px solid #334155', borderRadius: '8px',
                        color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleReject(selected.id)}
                      style={{
                        flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s'
                      }}
                    >
                      ✕ {t('reject')}
                    </button>
                    <button
                      onClick={() => handleApprove(selected.id)}
                      style={{
                        flex: 1, padding: '12px', background: primaryColor,
                        color: '#fff', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s'
                      }}
                    >
                      ✓ {t('approveAndRefund')}
                    </button>
                  </div>
                </>
              ) : (
                selected.admin_comment && (
                  <div style={{ background: STATUS_CONFIG[selected.status]?.bg || 'var(--bg-primary)', borderRadius: '8px', padding: '12px', border: `1px solid ${STATUS_CONFIG[selected.status]?.color}30` }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: STATUS_CONFIG[selected.status]?.color, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {selected.status === 'rejected' ? t('rejectionReason') : t('adminCommentLabel')}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.admin_comment}</p>
                  </div>
                )
              )}

              {/* ID del reembolso de Stripe si existe */}
              {selected.stripe_refund_id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <CreditCard size={14} style={{ color: '#6366f1' }} />
                  <p style={{ margin: 0, fontSize: '12px', color: '#818cf8' }}>Stripe: {selected.stripe_refund_id}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* modal de confirmación */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => !actionLoading && setConfirmModal({ open: false })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%' }}
            >
              {confirmModal.type === 'approve' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={22} style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {t('confirmRefundOf')} {formatAmount(selected?.refund_amount)}?
                      </h3>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {t('confirmRefundMsg')}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertCircle size={22} style={{ color: '#ef4444' }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('confirmRejectTitle')}</h3>
                  </div>
                  <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {t('confirmRejectMsg')}
                  </p>
                </>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setConfirmModal({ open: false })}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '11px', background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={confirmAction}
                  disabled={actionLoading}
                  style={{
                    flex: 1, padding: '11px',
                    background: confirmModal.type === 'approve' ? primaryColor : '#ef4444',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '14px', opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? t('processing') : confirmModal.type === 'approve' ? t('confirmRefund') : t('confirmRejection')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Returns
