import React from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Heart, Eye, Leaf, Star, Minus, Plus, ShoppingCart } from 'lucide-react'
import CertificationBadges from '../CertificationBadges'
import { useConfig } from '../../context/ConfigContext'

const ProductCard = ({
  product,
  getItemQuantity,
  handleAddToCart,
  handleQuantityChange,
  getProductImage,
  variant = 'default'
}) => {
  const config = useConfig()
  const hasSustainability = config?.features?.sustainability !== false
  const hasCertifications = config?.features?.certifications !== false

  const quantity  = getItemQuantity(product.id)
  const isInStock = product.stock_quantity > 0
  const isModern  = variant === 'modern'
  const isMinimal = variant === 'minimal'

  // ─── MODERN variant ────────────────────────────────────────────────────────
  if (isModern) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden shop-card bg-white shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
      >
        {/* Imagen ocupa ~65% del alto */}
        <div className="relative overflow-hidden" style={{ paddingBottom: '65%' }}>
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E' }}
          />

          {/* Overlay oscuro al hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500" />

          {/* Badges eco/stock — top left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {hasSustainability && product.eco_friendly && (
              <span className="bg-green-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow">
                <Leaf className="w-3 h-3" /> Eco
              </span>
            )}
            {!isInStock && (
              <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full shadow">
                Agotado
              </span>
            )}
          </div>

          {/* Botones wishlist — top right, aparecen al hover */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors">
              <Heart className="w-4 h-4 text-gray-700" />
            </button>
            <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors">
              <Eye className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Precio en overlay — aparece al hover, bottom de la imagen */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-400 z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white text-2xl font-bold drop-shadow">
                  €{parseFloat(product.price).toFixed(2)}
                </span>
                {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
                  <span className="text-white/60 text-sm line-through ml-2">
                    €{parseFloat(product.compare_price).toFixed(2)}
                  </span>
                )}
              </div>
              {isInStock ? (
                quantity > 0 ? (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                    <button onClick={() => handleQuantityChange(product, -1)} className="text-white hover:text-gray-200 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold min-w-[1.5rem] text-center">{quantity}</span>
                    <button onClick={() => handleQuantityChange(product, 1)} disabled={quantity >= product.stock_quantity} className="text-white hover:text-gray-200 transition-colors disabled:opacity-50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Añadir
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* Info — debajo de la imagen */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">
              €{parseFloat(product.price).toFixed(2)}
            </span>
            {hasSustainability && product.sustainability_score && (
              <div className="flex items-center gap-1 text-green-600">
                <Leaf className="w-3 h-3" />
                <span className="text-xs font-medium">{product.sustainability_score}%</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ─── MINIMAL variant ───────────────────────────────────────────────────────
  if (isMinimal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group"
      >
        {/* Imagen cuadrada, sin borde */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 mb-4">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E' }}
          />

          {/* Botón + circular al hover — bottom right */}
          {isInStock && quantity === 0 && (
            <button
              onClick={() => handleAddToCart(product)}
              className="absolute bottom-3 right-3 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-900 hover:text-white transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* Sin stock overlay */}
          {!isInStock && (
            <div className="absolute inset-0 bg-white/50 flex items-end justify-center pb-4">
              <span className="text-xs tracking-widest uppercase text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow">
                Agotado
              </span>
            </div>
          )}
        </div>

        {/* Info mínima */}
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-semibold text-sm">
              €{parseFloat(product.price).toFixed(2)}
            </span>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
              <span className="text-gray-400 text-xs line-through">
                €{parseFloat(product.compare_price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Control cantidad si ya está en carrito */}
          {isInStock && quantity > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleQuantityChange(product, -1)}
                className="w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(product, 1)}
                disabled={quantity >= product.stock_quantity}
                className="w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // ─── DEFAULT / CLASSIC variant ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white shop-card shadow-md hover:shadow-xl border border-gray-100 transition-all duration-300 group flex flex-col"
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E' }}
        />

        {/* Badges overlay — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasSustainability && product.eco_friendly && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Leaf className="w-3 h-3" /> Eco
            </span>
          )}
          {!isInStock && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
              Sin Stock
            </span>
          )}
        </div>

        {/* Wishlist / vista rápida — top right, aparecen al hover */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
            <Heart className="w-4 h-4 text-gray-500" />
          </button>
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug text-sm">
          {product.name}
        </h3>

        {/* Certificaciones */}
        {hasCertifications && (
        <div className="mb-2">
          <CertificationBadges productId={product.id} showDetails={false} maxVisible={3} size="sm" />
        </div>
        )}

        {/* Precio */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: 'var(--c-primary)' }}>
              €{parseFloat(product.price).toFixed(2)}
            </span>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
              <span className="text-xs text-gray-400 line-through">
                €{parseFloat(product.compare_price).toFixed(2)}
              </span>
            )}
          </div>
          {hasSustainability && product.sustainability_score && (
            <div className="flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-full">
              <Leaf className="w-3 h-3 text-green-600" />
              <span className="text-xs font-semibold text-green-700">{product.sustainability_score}%</span>
            </div>
          )}
        </div>

        {/* Rating simulado */}
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.2)</span>
        </div>

        {/* Stock */}
        <div className="text-xs mb-3">
          {isInStock
            ? <span className="text-green-600 font-medium">✓ En stock ({product.stock_quantity} disp.)</span>
            : <span className="text-red-500 font-medium">✗ Sin stock</span>
          }
        </div>

        {/* Botón / control de cantidad */}
        <div className="mt-auto">
          {isInStock && (
            quantity > 0 ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-2 py-1">
                <button onClick={() => handleQuantityChange(product, -1)} className="p-1.5 hover:bg-white rounded-md transition-colors">
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-base font-bold text-gray-900">{quantity}</span>
                <button onClick={() => handleQuantityChange(product, 1)} disabled={quantity >= product.stock_quantity} className="p-1.5 hover:bg-white rounded-md transition-colors disabled:opacity-40">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAddToCart(product)}
                className="w-full flex items-center justify-center gap-2 py-2.5 shop-btn-primary text-sm font-semibold"
              >
                <ShoppingCart className="w-4 h-4" />
                Añadir al carrito
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ProductCard
