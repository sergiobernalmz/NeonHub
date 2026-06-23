import React, { useCallback, useState, useEffect, useMemo } from 'react'
import API_BASE_URL from '../config/api'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../context/ConfigContext'
import { isDarkColor, getTextColor } from '../utils/colorUtils'
import { uploadService } from '../services/uploadService'

const CartSidebar = () => {
  const navigate = useNavigate()
  const config = useConfig()
  const isDark = isDarkColor(config.colors?.background || '#ffffff')
  const textColor = getTextColor(config.colors?.background || '#ffffff')
  const primary = config.colors?.primary || '#2563eb'

  const panelBg    = isDark ? 'rgba(15,23,42,0.97)'   : 'rgba(255,255,255,0.98)'
  const borderColor= isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
  const subtextCol = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const itemBg     = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb'
  const inputBg    = isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'

  const hasDiscounts = config?.features?.discounts !== false

  const {
    items,
    total,
    itemCount,
    isOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    appliedDiscount,
    setAppliedDiscount,
  } = useCart()

  const [couponCode, setCouponCode]   = useState('')
  const [couponError, setCouponError] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
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

  const handleQuantityChange = useCallback((productId, newQuantity) => {
    if (newQuantity <= 0) removeItem(productId)
    else updateQuantity(productId, newQuantity)
  }, [removeItem, updateQuantity])

  const proceedToCheckout = useCallback(() => {
    setCartOpen(false)
    navigate('/checkout')
  }, [setCartOpen, navigate])

  const handleClose = useCallback(() => setCartOpen(false), [setCartOpen])

  const applyCoupon = async () => {
    if (!couponCode.trim() || applyingCoupon) return
    setApplyingCoupon(true)
    setCouponError('')
    try {
      const res = await fetch(`${API_BASE_URL}/public/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, order_amount: total })
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedDiscount(data)
        setCouponCode('')
      } else {
        setCouponError(data.message || 'Código no válido')
      }
    } catch {
      setCouponError('Error al validar el código')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setAppliedDiscount(null)
    setCouponCode('')
    setCouponError('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md shadow-xl z-50 flex flex-col"
            style={{ background: panelBg, color: textColor }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <h2 className="text-xl font-semibold flex items-center" style={{ color: textColor }}>
                <ShoppingBag className="w-6 h-6 mr-2" style={{ color: primary }} />
                Carrito ({itemCount})
              </h2>
              <button onClick={handleClose} className="p-2 rounded-lg transition-colors" style={{ color: subtextCol }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 mb-4" style={{ color: subtextCol, opacity: 0.4 }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: textColor }}>Tu carrito está vacío</h3>
                  <p style={{ color: subtextCol }}>Agrega algunos productos para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center space-x-4 p-4 rounded-lg"
                      style={{ backgroundColor: itemBg }}
                    >
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={uploadService.getImageUrl(item.images?.[0]?.thumbnailUrl || item.images?.[0]?.url) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate" style={{ color: textColor }}>{item.name}</h4>
                        <p className="text-sm" style={{ color: subtextCol }}>€{parseFloat(item.price).toFixed(2)} c/u</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            disabled={item.quantity >= item.stock_quantity}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: primary }}>
                          €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6" style={{ borderTop: `1px solid ${borderColor}` }}>

                {/* Cupón de descuento */}
                {hasDiscounts && (
                  <div style={{ marginBottom: '16px' }}>
                    {!appliedDiscount ? (
                      <>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            value={couponCode}
                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                            onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                            placeholder="Código de descuento"
                            style={{
                              flex: 1, padding: '8px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${couponError ? '#ef4444' : borderColor}`,
                              background: inputBg,
                              color: textColor, fontSize: '13px', outline: 'none'
                            }}
                          />
                          <button
                            onClick={applyCoupon}
                            disabled={applyingCoupon || !couponCode.trim()}
                            style={{
                              padding: '8px 14px', borderRadius: '8px',
                              border: `1px solid ${primary}`,
                              color: primary, background: 'transparent',
                              cursor: applyingCoupon || !couponCode.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '13px', fontWeight: 600,
                              opacity: applyingCoupon || !couponCode.trim() ? 0.5 : 1,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {applyingCoupon ? '...' : 'Aplicar'}
                          </button>
                        </div>
                        {couponError && (
                          <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{couponError}</p>
                        )}
                      </>
                    ) : (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', background: 'rgba(34,197,94,0.1)',
                        borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)'
                      }}>
                        <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                          🏷️ {appliedDiscount.code} — {appliedDiscount.message}
                        </span>
                        <button
                          onClick={removeCoupon}
                          style={{ background: 'none', border: 'none', color: subtextCol, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Desglose de precios */}
                <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: subtextCol }}>Subtotal</span>
                    <span style={{ color: textColor }}>€{total.toFixed(2)}</span>
                  </div>

                  {appliedDiscount && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#22c55e' }}>Descuento</span>
                      <span style={{ color: '#22c55e' }}>-€{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: shippingConfig && shippingCost > 0 ? '2px' : '6px' }}>
                    <span style={{ color: subtextCol }}>Envío</span>
                    <span style={{ color: shippingCost === 0 ? '#22c55e' : textColor, fontWeight: shippingCost === 0 ? 600 : 400 }}>
                      {!shippingConfig ? '...' : shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}
                    </span>
                  </div>

                  {shippingConfig && shippingCost > 0 && !shippingConfig.free_shipping_disabled && (
                    <p style={{ color: subtextCol, fontSize: '11px', margin: '0 0 6px', textAlign: 'right' }}>
                      Envío gratis a partir de €{shippingConfig.free_shipping_threshold}
                    </p>
                  )}

                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontWeight: 700, fontSize: '16px',
                    borderTop: `1px solid ${borderColor}`,
                    paddingTop: '8px', marginTop: '4px'
                  }}>
                    <span style={{ color: textColor }}>Total</span>
                    <span style={{ color: primary }}>€{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botones */}
                <div className="space-y-3">
                  <button
                    onClick={proceedToCheckout}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primary, color: isDarkColor(primary) ? '#ffffff' : '#111827' }}
                  >
                    Proceder al Checkout
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2 px-4 rounded-lg font-medium transition-colors"
                    style={{ color: subtextCol }}
                  >
                    Vaciar Carrito
                  </button>
                </div>

                <div className="mt-4 text-xs text-center" style={{ color: subtextCol }}>
                  <p>Devoluciones gratis en 30 días</p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CartSidebar
