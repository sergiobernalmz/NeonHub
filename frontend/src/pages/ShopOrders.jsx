import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, ArrowLeft, Calendar, CreditCard, MapPin, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfig } from '../context/ConfigContext'

const ShopOrders = () => {
  const { user } = useAuth()
  const { showError } = useToast()
  const navigate = useNavigate()
  const config = useConfig()
  const primary = config?.colors?.primary || '#2563eb'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnOrder, setReturnOrder] = useState(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnDescription, setReturnDescription] = useState('')
  const [returnType, setReturnType] = useState('refund')
  const [submittingReturn, setSubmittingReturn] = useState(false)

  const openInvoice = async (invoiceId) => {
    setLoadingInvoice(invoiceId)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch(`/api/invoices/${invoiceId}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSelectedInvoice(data.data)
        setShowInvoiceModal(true)
      }
    } catch (err) {
      console.error('Error loading invoice preview:', err)
    } finally {
      setLoadingInvoice(false)
    }
  }

  const downloadInvoice = async (invoiceId, invoiceNumber) => {
    setDownloading(invoiceId)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch(`/api/invoices/${invoiceId}/pdf-customer`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${invoiceNumber || invoiceId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading invoice:', err)
    } finally {
      setDownloading(null)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch('/api/public/orders/my', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setOrders(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      showError('Error al cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return 'No especificada'
    if (typeof addr === 'string') return addr
    const { street, city, postal_code, country } = addr
    return [street, city, postal_code, country].filter(Boolean).join(', ') || 'No especificada'
  }

  const canReturn = (order) => {
    if (!['delivered', 'completed'].includes(order.status)) return false
    if (order.return) return false
    const days = Math.floor((Date.now() - new Date(order.updated_at)) / 86400000)
    return days <= 30
  }

  const openReturnModal = (order) => {
    setReturnOrder(order)
    setReturnReason('')
    setReturnDescription('')
    setReturnType('refund')
    setShowReturnModal(true)
  }

  const submitReturn = async () => {
    setSubmittingReturn(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch('/api/public/returns', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: returnOrder.id,
          reason: returnReason,
          description: returnDescription,
          refund_type: returnType
        })
      })
      const data = await response.json()
      if (data.success) {
        setShowReturnModal(false)
        fetchOrders()
      } else {
        showError(data.message || 'Error al enviar la solicitud')
      }
    } catch (err) {
      console.error(err)
      showError('Error al enviar la solicitud')
    } finally {
      setSubmittingReturn(false)
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'processing':
        return 'En proceso'
      case 'shipped':
        return 'Enviado'
      case 'delivered':
        return 'Entregado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a la tienda
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
          <p className="text-gray-600 mt-1">Consulta el estado de tus pedidos</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No tienes pedidos todavía
            </h2>
            <p className="text-gray-600 mb-6">
              Explora nuestra tienda y realiza tu primer pedido
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir a la tienda
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pedido #{order.order_number || order.id}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-1" />
                          €{order.total}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.invoice && (
                        <button
                          onClick={() => openInvoice(order.invoice.id)}
                          disabled={loadingInvoice === order.invoice.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${primary}`,
                            color: primary,
                            background: 'transparent',
                            cursor: loadingInvoice === order.invoice.id ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            opacity: loadingInvoice === order.invoice.id ? 0.6 : 1,
                          }}
                        >
                          {loadingInvoice === order.invoice.id ? '⏳' : '📄'} Ver factura
                        </button>
                      )}
                      {canReturn(order) && (
                        <button
                          onClick={() => openReturnModal(order)}
                          style={{ padding: '6px 12px', borderRadius: '6px',
                            border: '1px solid #ef4444', color: '#ef4444',
                            background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ↩️ Devolver
                        </button>
                      )}
                      {order.return && (
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                          background: order.return.status === 'pending' ? 'rgba(234,179,8,0.15)'
                            : order.return.status === 'approved' ? 'rgba(34,197,94,0.15)'
                            : order.return.status === 'rejected' ? 'rgba(239,68,68,0.15)'
                            : 'rgba(100,116,139,0.15)',
                          color: order.return.status === 'pending' ? '#ca8a04'
                            : order.return.status === 'approved' ? '#16a34a'
                            : order.return.status === 'rejected' ? '#dc2626'
                            : '#64748b'
                        }}>
                          {order.return.status === 'pending' ? '⏳ Devolución pendiente'
                            : order.return.status === 'approved' ? '✅ Devolución aprobada'
                            : order.return.status === 'rejected' ? '❌ Devolución rechazada'
                            : '↩️ Devuelto'}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Productos</h4>
                      <div className="space-y-2">
                        {order.items?.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  flexShrink: 0
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                              }}>
                                📦
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-600">Cantidad: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <p className="text-sm text-blue-600">
                            +{order.items.length - 3} productos más
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Dirección de envío
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatAddress(order.shipping_address)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showInvoiceModal && selectedInvoice && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            style={{ background: '#fff', color: '#111', borderRadius: '16px', padding: '40px',
              maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>FACTURA</h2>
                <p style={{ color: '#64748b', margin: '4px 0', fontSize: '14px' }}>
                  {selectedInvoice.invoice_number}
                </p>
                <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                  {new Date(selectedInvoice.invoice_date).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, margin: 0, fontSize: '14px', color: '#64748b' }}>
                  {selectedInvoice.order?.order_number}
                </p>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '20px', color: '#94a3b8' }}
                >✕</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 600, margin: '0 0 8px', fontSize: '13px', color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>Facturado a:</p>
              <p style={{ margin: '2px 0', fontWeight: 500 }}>
                {[selectedInvoice.customer?.first_name, selectedInvoice.customer?.last_name].filter(Boolean).join(' ')}
              </p>
              <p style={{ margin: '2px 0', color: '#64748b', fontSize: '14px' }}>
                {selectedInvoice.customer?.email}
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</th>
                  <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: '#64748b',
                    textTransform: 'uppercase' }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px', color: '#64748b',
                    textTransform: 'uppercase' }}>Precio</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px', color: '#64748b',
                    textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 0', fontSize: '14px' }}>
                      {item.product?.name || item.description}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'center', fontSize: '14px' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '14px' }}>
                      €{parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '14px', fontWeight: 500 }}>
                      €{parseFloat(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Base imponible</span>
                <span style={{ fontSize: '14px' }}>€{parseFloat(selectedInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>IVA (21%)</span>
                <span style={{ fontSize: '14px' }}>€{parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(selectedInvoice.discount_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#16a34a', fontSize: '14px' }}>Descuento</span>
                  <span style={{ fontSize: '14px', color: '#16a34a' }}>-€{parseFloat(selectedInvoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                fontSize: '18px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <span>TOTAL</span>
                <span>€{parseFloat(selectedInvoice.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: 'transparent', cursor: 'pointer', fontSize: '14px' }}
              >
                Cerrar
              </button>
              <button
                onClick={() => downloadInvoice(selectedInvoice.id, selectedInvoice.invoice_number)}
                disabled={downloading === selectedInvoice.id}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '14px',
                  background: primary, color: '#fff',
                  opacity: downloading === selectedInvoice.id ? 0.6 : 1 }}
              >
                {downloading === selectedInvoice.id ? '⏳ Descargando...' : '⬇️ Descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && returnOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowReturnModal(false)}
        >
          <div
            style={{ background: '#fff', color: '#111', borderRadius: '16px', padding: '32px',
              maxWidth: '480px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
              Solicitar devolución
            </h3>
            <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: '14px' }}>
              Pedido #{returnOrder.order_number}
            </p>

            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Motivo de la devolución *
            </label>
            <select
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '16px',
                background: '#f8fafc', color: '#111', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="">Selecciona un motivo</option>
              <option value="defective">Producto defectuoso</option>
              <option value="not_as_described">No era lo esperado</option>
              <option value="damaged">Llegó dañado</option>
              <option value="wrong_item">Producto equivocado</option>
              <option value="other">Otro motivo</option>
            </select>

            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Descripción (opcional)
            </label>
            <textarea
              value={returnDescription}
              onChange={e => setReturnDescription(e.target.value)}
              placeholder="Describe el problema..."
              rows={3}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '16px',
                background: '#f8fafc', color: '#111', border: '1px solid #cbd5e1',
                resize: 'vertical', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              ¿Qué prefieres?
            </label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {['refund', 'exchange'].map(type => (
                <button
                  key={type}
                  onClick={() => setReturnType(type)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                    border: `2px solid ${returnType === type ? primary : '#cbd5e1'}`,
                    background: returnType === type ? `${primary}22` : 'transparent',
                    color: '#111', fontWeight: 500, fontSize: '14px' }}
                >
                  {type === 'refund' ? '💳 Reembolso' : '🔄 Cambio'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', background: 'transparent',
                  color: '#111', cursor: 'pointer', fontSize: '14px' }}
              >
                Cancelar
              </button>
              <button
                onClick={submitReturn}
                disabled={!returnReason || submittingReturn}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                  cursor: !returnReason || submittingReturn ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '14px',
                  background: returnReason ? primary : '#94a3b8',
                  color: '#fff', opacity: submittingReturn ? 0.7 : 1 }}
              >
                {submittingReturn ? 'Enviando...' : 'Solicitar devolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Pedido #{selectedOrder.order_number || selectedOrder.id}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Productos</label>
                  <div className="mt-2 space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity} × €{item.price}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          €{(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  {parseFloat(selectedOrder.shipping_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Envío</span>
                      <span>€{parseFloat(selectedOrder.shipping_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento</span>
                      <span>-€{parseFloat(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>€{selectedOrder.total}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Dirección de envío</label>
                  <p className="mt-2 text-gray-900">
                    {formatAddress(selectedOrder.shipping_address)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ShopOrders
