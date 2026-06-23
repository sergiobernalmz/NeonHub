import React from 'react'
import { Leaf, Minus, Plus, ShoppingCart } from 'lucide-react'
import CertificationBadges from '../CertificationBadges'

const ProductRow = ({ product, getItemQuantity, handleAddToCart, handleQuantityChange, getProductImage, config }) => {
  const quantity = getItemQuantity(product.id)
  const isInStock = product.stock_quantity > 0
  const hasSustainability = config?.features?.sustainability !== false

  return (
    <div
      className="tenant-card shadow-sm border p-4 flex gap-4 items-stretch group hover:shadow-lg transition-shadow bg-white rounded-xl"
      style={{
        backgroundColor: config.colors?.background === '#ffffff' ? '#ffffff' : 'rgba(255,255,255,0.03)',
        borderColor: config.colors?.background === '#ffffff' ? '#e5e7eb' : 'rgba(255,255,255,0.1)'
      }}
    >
      <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'
          }}
        />
        {!isInStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 bg-red-500 rounded">Agotado</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1 truncate">{product.name}</h3>

          {/* Certificaciones */}
          <div className="mb-2">
            <CertificationBadges
              productId={product.id}
              showDetails={false}
              maxVisible={4}
              size="sm"
            />
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
          <div className="mt-2 flex items-center gap-3 text-sm">
            {hasSustainability && product.eco_friendly && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 font-medium">
                <Leaf className="w-3 h-3" /> Eco Friendly
              </span>
            )}
            {isInStock ? (
              <span className="text-green-700 text-xs">✓ {product.stock_quantity} en stock</span>
            ) : (
              <span className="text-red-600 text-xs font-medium">Sin stock</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
          <div className="text-right">
            <div className="text-xl font-bold text-green-600">
              €{parseFloat(product.price).toFixed(2)}
            </div>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
              <div className="text-xs text-gray-500 line-through">
                €{parseFloat(product.compare_price).toFixed(2)}
              </div>
            )}
          </div>

          {isInStock && (
            <div className="flex items-center gap-2">
              {quantity > 0 ? (
                <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200">
                  <button
                    onClick={() => handleQuantityChange(product, -1)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="px-3 py-2 text-sm font-semibold bg-white min-w-[2.5rem] text-center border-x border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(product, 1)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex items-center space-x-2 shop-btn-primary px-4 py-2 hover:shadow-md h-10"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="font-medium">Añadir</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductRow
