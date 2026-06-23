import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Search, Filter, Eye, Package, ChevronDown, MoreVertical, Edit, Trash2, CheckCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import orderService from '../services/orderService'
import { uploadService } from '../services/uploadService'
import { connectSocket, disconnectSocket } from '../services/socketService'

const Orders = () => {
  const { t } = useLanguage()
  const { showSuccess, showError, showInfo } = useToast()
  const { user } = useAuth()
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  
  // Estado para las órdenes cargadas desde el backend
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-400/20 text-green-400'
      case 'pending': return 'bg-yellow-400/20 text-yellow-400'
      case 'processing': return 'bg-blue-400/20 text-blue-400'
      default: return 'bg-gray-600/20 text-gray-400'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'delivered': return t('delivered')
      case 'pending': return t('pending')
      case 'processing': return t('processing')
      default: return status
    }
  }

  // sacamos el nombre del cliente tanto si viene como string como si es un objeto
  const getCustomerName = (customer) => {
    if (!customer) return 'Cliente desconocido'

    // formato antiguo: el cliente viene ya como string
    if (typeof customer === 'string') return customer

    // formato nuevo: el cliente viene como objeto del backend
    if (typeof customer === 'object') {
      const firstName = customer.first_name || ''
      const lastName = customer.last_name || ''
      const companyName = customer.company_name || ''

      // preferimos el nombre de empresa, si no el nombre y apellido
      if (companyName) return companyName
      if (firstName || lastName) return `${firstName} ${lastName}`.trim()

      // como último recurso usamos el email
      if (customer.email) return customer.email
    }
    
    return 'Cliente desconocido'
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
    showInfo(`Viendo detalles de la orden ${order.id}`)
  }

  const handleEditOrder = (order) => {
    setEditingOrder({...order})
    setShowEditModal(true)
    setShowActionMenu(null)
    setShowOrderDetails(false) // Cerrar modal de detalles si está abierto
  }

  const handleDeleteOrder = async (order) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden ${order.id}?`)) {
      try {
        // Eliminar en el backend
        await orderService.deleteOrder(order.originalId || order.id)
        
        // Eliminar la orden del array
        setOrders(prevOrders => prevOrders.filter(o => o.id !== order.id))
        
        // Cerrar modales si la orden eliminada está abierta
        if (selectedOrder && selectedOrder.id === order.id) {
          closeOrderDetails()
        }
        if (editingOrder && editingOrder.id === order.id) {
          closeEditModal()
        }
        
        showSuccess(`Orden ${order.id} eliminada correctamente`)
        setShowActionMenu(null)
      } catch (error) {
        console.error('Error deleting order:', error)
        showError('Error al eliminar la orden')
      }
    }
  }

  const handleCompleteOrder = async (order) => {
    try {
      console.log('Updating order status for order:', order)
      console.log('Order ID being sent:', order.id)
      console.log('Original order object:', order.originalId || order.id)
      
      // usamos originalId si existe, si no el id normal
      const orderId = order.originalId || order.id

      // usamos 'delivered' en lugar de 'completed' para que coincida con el ENUM de la base de datos
      const newStatus = order.status === 'delivered' ? 'pending' : 'delivered'
      
      // Actualizar estado en el backend
      await orderService.updateOrderStatus(orderId, newStatus)
      
      // Actualizar el estado de la orden
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id ? { ...o, status: newStatus } : o
        )
      )
      
      // Actualizar también la orden seleccionada si está abierta
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
      }
      
      showSuccess(
        newStatus === 'delivered' ? t('orderDeliveredMsg') : t('orderPendingMsg')
      )
      setShowActionMenu(null)
    } catch (error) {
      console.error('Error updating order status:', error)
      showError('Error al actualizar el estado de la orden')
    }
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setShowOrderDetails(false)
  }

  const closeEditModal = () => {
    setEditingOrder(null)
    setShowEditModal(false)
  }

  // Cargar órdenes desde el backend
  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const ordersData = await orderService.getAllOrders()
      // normalizamos las distintas formas en que puede venir la respuesta del backend
      let list = []
      if (Array.isArray(ordersData)) {
        list = ordersData
      } else if (ordersData && Array.isArray(ordersData.data)) {
        list = ordersData.data
      } else if (ordersData && ordersData.data && Array.isArray(ordersData.data.orders)) {
        // el backend devuelve { success: true, data: { orders: [...], pagination: {...} } }
        list = ordersData.data.orders
      } else if (ordersData && Array.isArray(ordersData.orders)) {
        list = ordersData.orders
      } else {
        // Unexpected shape: log for debugging and attempt best-effort assignment
        console.warn('Unexpected orders response shape:', ordersData)
        // si parece un pedido suelto lo metemos en un array
        if (ordersData && typeof ordersData === 'object' && ordersData.id) {
          list = [ordersData]
        } else {
          list = []
        }
      }

      setOrders(list)
    } catch (error) {
      console.error('Error loading orders:', error)
      setError('Error al cargar las órdenes')
      showError('Error al cargar las órdenes')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOrder = async () => {
    if (!editingOrder) return
    
    try {
      // Actualizar en el backend
      await orderService.updateOrder(editingOrder.originalId || editingOrder.id, editingOrder)
      
      // Actualizar la orden en el array local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === editingOrder.id ? editingOrder : order
        )
      )
      
      // Actualizar también la orden seleccionada si está abierta en detalles
      if (selectedOrder && selectedOrder.id === editingOrder.id) {
        setSelectedOrder(editingOrder)
      }
      
      showSuccess(`Orden ${editingOrder.id} actualizada correctamente`)
      closeEditModal()
    } catch (error) {
      console.error('Error updating order:', error)
      showError('Error al actualizar la orden')
    }
  }

  const handleEditFieldChange = (field, value) => {
    setEditingOrder(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Cargar órdenes al montar el componente
  useEffect(() => {
    loadOrders()
  }, [])

  // Socket: escuchar eventos de pedidos en tiempo real
  useEffect(() => {
    const storeId = user?.store_id || user?.storeId
    if (!storeId) return

    const socket = connectSocket()

    socket.emit('join:store', storeId)

    socket.on('order:new', (data) => {
      showSuccess(`Nuevo pedido #${data.orderNumber} — €${Number(data.total).toFixed(2)}`)
      loadOrders()
    })

    socket.on('order:status-changed', (data) => {
      setOrders(prev =>
        prev.map(o =>
          (o.originalId || o.id) === data.orderId
            ? { ...o, status: data.status }
            : o
        )
      )
    })

    return () => {
      socket.off('order:new')
      socket.off('order:status-changed')
    }
  }, [user])

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActionMenu(null)
    }

    if (showActionMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionMenu])

  // Filtrar pedidos (proteger cuando orders no sea un array)
  const filteredOrders = Array.isArray(orders)
    ? orders.filter(order => {
        const customerName = getCustomerName(order.customer)
        const orderId = order.id || order.order_number || ''
        const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             orderId.toString().toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        return matchesSearch && matchesStatus
      })
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('ordersTitle')}</h1>
          <p className="text-gray-400">{t('ordersDescription')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchOrders')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center"
          >
            <Filter className="w-5 h-5 mr-2" />
            {t('orderFilters')}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Filtros desplegables */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-700/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('orderStatus')}</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="all">{t('all')}</option>
                  <option value="delivered">{t('delivered')}</option>
                  <option value="pending">{t('pending')}</option>
                  <option value="processing">{t('processing')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('dateFrom')}</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('dateTo')}</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-gray-300">{t('loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-red-400 mb-2">❌ {error}</div>
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/30">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('orderId')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('customer')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('date')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('total')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('status')}</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-300 font-mono">{order.id || order.order_number}</td>
                  <td className="py-3 px-4 text-gray-200">{getCustomerName(order.customer)}</td>
                  <td className="py-3 px-4 text-gray-300">{order.date || order.order_date}</td>
                  <td className="py-3 px-4 text-gray-200 font-semibold">
                    {order.total}
                    {parseFloat(order.discount_amount || 0) > 0 && (
                      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                        {order.discount_code ? `-${order.discount_code} ` : ''}(-€{parseFloat(order.discount_amount).toFixed(2)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActionMenu(showActionMenu === order.id ? null : order.id)
                          }}
                          className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded"
                          title="Más acciones"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {showActionMenu === order.id && (
                          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[150px]">
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg"
                            >
                              <Edit className="w-3 h-3" />
                              {t('edit')}
                            </button>
                            {order.status !== 'delivered' && (
                              <button
                                onClick={() => handleCompleteOrder(order)}
                                className="w-full px-3 py-2 text-left text-green-400 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {t('completed')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="w-full px-3 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 last:rounded-b-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal de detalles de orden */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Detalles de la Orden {selectedOrder.id}
              </h3>
              <button
                onClick={closeOrderDetails}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                  <p className="text-white">{getCustomerName(selectedOrder.customer)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
                  <p className="text-white">{selectedOrder.date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Total</label>
                  <p className="text-white text-lg font-semibold">{selectedOrder.total}</p>
                  {parseFloat(selectedOrder.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ color: '#22c55e', fontSize: '13px' }}>
                        🏷️ Descuento{selectedOrder.discount_code ? ` (${selectedOrder.discount_code})` : ''}
                      </span>
                      <span style={{ color: '#22c55e', fontSize: '13px' }}>
                        -€{parseFloat(selectedOrder.discount_amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.shipping_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Envío</span>
                      <span style={{ fontSize: '13px' }}>€{parseFloat(selectedOrder.shipping_amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Artículos</label>
                  <p className="text-white">{selectedOrder.items} productos</p>
                </div>
              </div>
            </div>

            {selectedOrder.shipping_address && (
              <div className="mt-6 pt-6 border-t border-gray-700/30">
                <h4 className="text-lg font-medium text-white mb-3">Dirección de envío</h4>
                <div className="bg-gray-700/30 rounded-lg p-4 text-sm text-gray-300 space-y-1">
                  {selectedOrder.shipping_address.street && <p>{selectedOrder.shipping_address.street}</p>}
                  {selectedOrder.shipping_address.line1 && <p>{selectedOrder.shipping_address.line1}</p>}
                  {(selectedOrder.shipping_address.city || selectedOrder.shipping_address.state || selectedOrder.shipping_address.postal_code) && (
                    <p>
                      {[selectedOrder.shipping_address.city, selectedOrder.shipping_address.state, selectedOrder.shipping_address.postal_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {selectedOrder.shipping_address.country && <p>{selectedOrder.shipping_address.country}</p>}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-700/30">
              <h4 className="text-lg font-medium text-white mb-4">Productos en la orden</h4>
              <div className="space-y-2">
                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                  selectedOrder.orderItems.map((item, idx) => (
                    <div key={item.id || idx} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0] && (
                            <img
                              src={uploadService.getImageUrl(item.product.images[0]?.url)}
                              alt={item.product?.name || 'Producto'}
                              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="text-white font-medium">{item.product_snapshot?.name || item.product?.name || 'Producto'}</p>
                            <p className="text-gray-400 text-sm">Cantidad: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-white font-semibold">€{parseFloat(item.line_total || item.unit_price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">Sin artículos</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeOrderDetails}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleEditOrder(selectedOrder)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar Orden
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de edición de orden */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Editar Orden {editingOrder.id}
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveOrder(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={getCustomerName(editingOrder.customer)}
                      onChange={(e) => handleEditFieldChange('customer', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={editingOrder.date}
                      onChange={(e) => handleEditFieldChange('date', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total
                    </label>
                    <input
                      type="text"
                      value={editingOrder.total}
                      onChange={(e) => handleEditFieldChange('total', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="€0.00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Estado
                    </label>
                    <select
                      value={editingOrder.status}
                      onChange={(e) => handleEditFieldChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="processing">Procesando</option>
                      <option value="delivered">Entregado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Número de artículos
                    </label>
                    <input
                      type="number"
                      value={editingOrder.items}
                      onChange={(e) => handleEditFieldChange('items', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ID de Orden (solo lectura)
                    </label>
                    <input
                      type="text"
                      value={editingOrder.id}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700/30 pt-6">
                <h4 className="text-lg font-medium text-white mb-4">Notas adicionales</h4>
                <textarea
                  placeholder="Agregar notas sobre la orden..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/30">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

export default Orders