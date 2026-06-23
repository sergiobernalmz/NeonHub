import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { useStripe, useElements, CardNumberElement } from '@stripe/react-stripe-js'
import { isDarkColor, getTextColor, getSubtextColor } from '../utils/colorUtils'
import PaymentForm from '../components/PaymentForm'
import { uploadService } from '../services/uploadService'
import API_BASE_URL from '../config/api'

const Checkout = () => {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()
  const { items, total, itemCount, setCustomer, setShippingAddress, setPaymentMethod, processOrder, clearCart, appliedDiscount } = useCart()
  const { user, isAuthenticated } = useAuth()
  const config = useConfig()

  // tema del tenant
  const bg      = config.colors?.background || '#0f172a'
  const primary  = config.colors?.primary   || '#6366f1'
  const isDark   = isDarkColor(bg)
  const textColor    = getTextColor(bg)
  const subtextColor = getSubtextColor(bg)
  const bgStyle  = config.design?.gradient_enabled
    ? `linear-gradient(${config.design.gradient_direction || 'to bottom right'}, ${config.design.gradient_start || bg}, ${config.design.gradient_end || bg})`
    : bg
  const cardBg     = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.03)'
  const cardBorder = `1px solid ${primary}33`
  const inputBg    = isDark ? 'rgba(255,255,255,0.07)'  : '#f9fafb'
  const inputBorder= isDark ? 'rgba(255,255,255,0.15)'  : '#d1d5db'
  const btnTextColor = isDarkColor(primary) ? '#ffffff' : '#111827'

  const [shippingForm, setShippingForm] = useState({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: ''
  })

  const [loading, setLoading] = useState(false)
  const [paymentReady, setPaymentReady] = useState(false)
  const [error, setError] = useState(null)
  const [shippingConfig, setShippingConfig] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/shipping-config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setShippingConfig(data) })
      .catch(() => {})
  }, [])

  const shippingCost = useMemo(() => {
    if (!shippingConfig) return 0
    if (shippingConfig.free_shipping_disabled) return shippingConfig.shipping_cost
    return total >= shippingConfig.free_shipping_threshold ? 0 : shippingConfig.shipping_cost
  }, [shippingConfig, total])

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0
    if (appliedDiscount.type === 'percentage') return (total * appliedDiscount.value) / 100
    return Math.min(appliedDiscount.value, total)
  }, [appliedDiscount, total])

  const finalTotal = total + shippingCost - discountAmount

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
  const inputStyle = {
    backgroundColor: inputBg,
    border: `1px solid ${inputBorder}`,
    color: textColor,
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()

    if (!isAuthenticated || !user) {
      setError('Debes iniciar sesión para completar la compra.')
      setTimeout(() => navigate('/login', { state: { from: '/checkout', message: 'Debes iniciar sesión para comprar.' } }), 1200)
      return
    }

    if (!stripe || !elements) {
      setError('Stripe no está listo. Espera un momento.')
      return
    }

    if (!paymentReady) {
      setError('Por favor completa los datos de tu tarjeta')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setCustomer({
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        phone: user.phone || ''
      })
      setShippingAddress(shippingForm)
      setPaymentMethod('card')

      const result = await processOrder(shippingForm)

      if (!result || !result.clientSecret) {
        throw new Error('No se pudo crear el pedido o el payment intent')
      }

      const { clientSecret, order } = result

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardNumberElement),
            billing_details: {
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              address: {
                line1: shippingForm.street,
                city: shippingForm.city,
                state: shippingForm.state,
                postal_code: shippingForm.postal_code,
                country: shippingForm.country
              }
            }
          }
        }
      )

      if (stripeError) {
        setError(stripeError.message)
        setLoading(false)
        return
      }

      if (paymentIntent.status === 'succeeded') {
        clearCart()
        navigate('/order-confirmation', { state: { order, paymentIntent } })
      } else {
        setError('El pago no se completó. Inténtalo de nuevo.')
        setLoading(false)
      }

    } catch (err) {
      setError(err.message || 'Error al procesar el pedido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: bgStyle, color: textColor }}>
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">

        {/* cabecera */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logo ? (
              <img src={config.logo} alt={config.name} className="h-8 w-auto object-contain" />
            ) : (
              <span className="font-bold text-lg" style={{ color: textColor }}>{config.name}</span>
            )}
            <span style={{ color: subtextColor }}>·</span>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" style={{ color: primary }} />
              <span className="font-semibold text-lg" style={{ color: textColor }}>Checkout seguro</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: subtextColor }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* izquierda — info + envío + pago */}
          <div className="lg:col-span-3 space-y-5">

            {/* información personal */}
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: cardBorder }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: textColor }}>Información personal</h2>
              {isAuthenticated && user ? (
                <div className="rounded-xl p-4 text-sm space-y-1" style={{ background: inputBg }}>
                  <div style={{ color: textColor }}><span style={{ color: subtextColor }}>Nombre: </span>{user.name}</div>
                  <div style={{ color: textColor }}><span style={{ color: subtextColor }}>Email: </span>{user.email}</div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: subtextColor }}>
                  Debes <button type="button" onClick={() => navigate('/login')} className="underline" style={{ color: primary }}>iniciar sesión</button> para continuar.
                </p>
              )}
            </div>

            {/* dirección de envío */}
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: cardBorder }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: textColor }}>Dirección de envío</h2>
              <div className="space-y-3">
                <input
                  required
                  placeholder="Calle y número"
                  value={shippingForm.street}
                  onChange={e => setShippingForm({ ...shippingForm, street: e.target.value })}
                  className={inputClass}
                  style={{ ...inputStyle, '--tw-ring-color': primary }}
                />
                <input
                  required
                  placeholder="Ciudad"
                  value={shippingForm.city}
                  onChange={e => setShippingForm({ ...shippingForm, city: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Provincia"
                    value={shippingForm.state}
                    onChange={e => setShippingForm({ ...shippingForm, state: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                  <input
                    placeholder="Código postal"
                    value={shippingForm.postal_code}
                    onChange={e => setShippingForm({ ...shippingForm, postal_code: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <input
                  required
                  placeholder="País (ej: ES)"
                  value={shippingForm.country}
                  onChange={e => setShippingForm({ ...shippingForm, country: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* pago */}
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: cardBorder }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: textColor }}>Datos de pago</h2>
              {config?.subdomain === 'demo' && (
                <div style={{
                  background: 'rgba(234,179,8,0.15)', border: '1px solid #ca8a04',
                  borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
                  fontSize: '13px', color: '#ca8a04',
                }}>
                  🧪 <strong>Modo demo</strong> — Usa la tarjeta de prueba:<br />
                  <code style={{ fontSize: '14px', letterSpacing: '2px' }}>4242 4242 4242 4242</code>
                  {' '}· Cualquier fecha futura · Cualquier CVC
                </div>
              )}
              <PaymentForm onPaymentMethodReady={setPaymentReady} disabled={loading} isDark={isDark} />
            </div>

            {/* mensaje de error */}
            {error && (
              <div className="rounded-xl p-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* derecha — resumen del pedido */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-2xl p-6" style={{ background: cardBg, border: cardBorder }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: textColor }}>
                Resumen del pedido
                <span className="ml-2 text-sm font-normal" style={{ color: subtextColor }}>({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})</span>
              </h2>

              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    {/* miniatura del producto */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: inputBg }}>
                      <img
                        src={uploadService.getImageUrl(item.images?.[0]?.thumbnailUrl || item.images?.[0]?.url) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: textColor }}>{item.name}</p>
                      <p className="text-xs" style={{ color: subtextColor }}>{item.quantity} × €{parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0" style={{ color: primary }}>
                      €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-2" style={{ borderTop: `1px solid ${primary}22` }}>
                <div className="flex justify-between text-sm" style={{ color: subtextColor }}>
                  <span>Subtotal</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
                {appliedDiscount && discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#22c55e' }}>🏷️ {appliedDiscount.code}</span>
                    <span className="font-medium" style={{ color: '#22c55e' }}>-€{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: subtextColor }}>Envío</span>
                  <span className={shippingCost === 0 ? 'text-green-500 font-medium' : ''} style={{ color: shippingCost > 0 ? textColor : undefined }}>
                    {!shippingConfig ? '...' : shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: `1px solid ${primary}22`, color: textColor }}>
                  <span>Total</span>
                  <span style={{ color: primary }}>€{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !stripe || !paymentReady}
                className="mt-5 w-full py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: primary, color: btnTextColor }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pagar €{finalTotal.toFixed(2)}
                  </>
                )}
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: subtextColor }}>
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: primary }} />
                Pago seguro con Stripe
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Checkout
