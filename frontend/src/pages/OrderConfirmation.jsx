import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, ShoppingBag, ClipboardList } from 'lucide-react'
import { useConfig } from '../context/ConfigContext'
import { isDarkColor, getTextColor, getSubtextColor } from '../utils/colorUtils'

const OrderConfirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const config = useConfig()
  const [order, setOrder] = useState(null)

  const bg         = config.colors?.background || '#0f172a'
  const primary    = config.colors?.primary    || '#6366f1'
  const isDark     = isDarkColor(bg)
  const textColor  = getTextColor(bg)
  const subtext    = getSubtextColor(bg)
  const bgStyle    = config.design?.gradient_enabled
    ? `linear-gradient(${config.design.gradient_direction || 'to bottom right'}, ${config.design.gradient_start || bg}, ${config.design.gradient_end || bg})`
    : bg
  const cardBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const cardBorder = `1px solid ${primary}33`
  const btnText    = isDarkColor(primary) ? '#ffffff' : '#111827'

  useEffect(() => {
    if (location.state?.order) {
      setOrder(location.state.order)
    } else if (location.search) {
      const id = new URLSearchParams(location.search).get('id')
      if (id) setOrder({ id })
    }
  }, [location])

  const orderNumber  = order?.order_number || order?.id || '—'
  const orderTotal   = order?.total_amount  != null ? Number(order.total_amount).toFixed(2) : null
  const customerName = order?.customer
    ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
    : null
  const items = order?.items || []

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: bgStyle, color: textColor }}>
      <div className="w-full max-w-lg">

        {/* Card */}
        <div className="rounded-2xl p-8 text-center" style={{ background: cardBg, border: cardBorder }}>

          {/* Icono */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${primary}22` }}>
              <CheckCircle className="w-8 h-8" style={{ color: primary }} />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
            ¡Gracias por tu compra{customerName ? `, ${customerName.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-sm mb-6" style={{ color: subtext }}>
            Tu pedido ha sido confirmado y está siendo procesado.
          </p>

          {/* Número de pedido + total */}
          <div className="rounded-xl p-4 mb-5 text-left space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${primary}22` }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: subtext }}>Número de pedido</span>
              <span className="font-mono font-semibold" style={{ color: primary }}>{orderNumber}</span>
            </div>
            {orderTotal && (
              <div className="flex justify-between text-sm">
                <span style={{ color: subtext }}>Total pagado</span>
                <span className="font-semibold" style={{ color: textColor }}>€{orderTotal}</span>
              </div>
            )}
            {order?.status && (
              <div className="flex justify-between text-sm">
                <span style={{ color: subtext }}>Estado</span>
                <span className="capitalize font-medium" style={{ color: primary }}>{order.status}</span>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="rounded-xl p-4 mb-5 text-left" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${primary}22` }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: subtext }}>Artículos</p>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between text-sm">
                    <span style={{ color: textColor }}>
                      {item.product?.name || item.name || 'Producto'} × {item.quantity}
                    </span>
                    <span style={{ color: primary }}>€{Number(item.line_total || item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email */}
          <p className="text-sm mb-8" style={{ color: subtext }}>
            Te hemos enviado un email de confirmación con los detalles de tu pedido.
          </p>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/shop/orders')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: primary, color: btnText }}
            >
              <ClipboardList className="w-4 h-4" />
              Ver mis pedidos
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: cardBg, border: cardBorder, color: textColor }}
            >
              <ShoppingBag className="w-4 h-4" />
              Seguir comprando
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default OrderConfirmation
