import React from 'react'
import { useConfig } from '../../context/ConfigContext'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Search, ShoppingCart, Leaf, Package } from 'lucide-react'
import UserMenu from './UserMenu'
import ProductCard from './ProductCard'
import { isDarkColor, getTextColor, getSubtextColor } from '../../utils/colorUtils'

const LayoutMinimal = ({
  searchTerm, setSearchTerm,
  toggleCart, itemCount,
  showUserMenu, setShowUserMenu, userMenuRef,
  selectedCategory, setSelectedCategory, categories,
  showEcoOnly, setShowEcoOnly,
  sortedProducts, loading,
  getItemQuantity, handleAddToCart, handleQuantityChange, getProductImage
}) => {
  const config = useConfig();
  const isSectionActive = (key) => config.sections?.[key] !== false;
  const hasSustainability = config?.features?.sustainability !== false;

  const bg      = config.colors?.background || '#ffffff'
  const primary = config.colors?.primary    || '#111827'
  const dark    = isDarkColor(bg)
  const textColor    = getTextColor(bg)
  const subtextColor = getSubtextColor(bg)
  const bgStyle = config.design?.gradient_enabled
    ? `linear-gradient(${config.design.gradient_direction || 'to bottom right'}, ${config.design.gradient_start || bg}, ${config.design.gradient_end || bg})`
    : bg

  return (
    <div className="layout-minimal min-h-screen" style={{ background: bgStyle, color: textColor }}>

      {/* ── NAVBAR ultra thin ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)',
          borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          {/* Izquierda — UserMenu */}
          <div className="flex-1 flex justify-start">
            <UserMenu
              showUserMenu={showUserMenu}
              setShowUserMenu={setShowUserMenu}
              userMenuRef={userMenuRef}
              config={config}
              contrastClass={dark ? 'text-white' : 'text-gray-900'}
              subContrastClass={dark ? 'text-gray-300' : 'text-gray-500'}
              features={config?.features}
            />
          </div>
          {/* Centro — Logo o nombre */}
          <div className="flex-shrink-0">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="h-7 w-auto object-contain" />
            ) : (
              <span
                className="font-semibold text-base tracking-widest uppercase text-center"
                style={{ color: textColor }}
              >
                {config.name}
              </span>
            )}
          </div>
          {/* Derecha — carrito */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleCart}
              className="relative p-2 transition-colors"
              style={{ color: textColor }}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: primary }}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Descripción debajo del logo/nombre */}
        {config.desc && (
          <div className="max-w-2xl mx-auto px-6 pt-2 pb-0 text-center">
            <span className="text-sm block truncate" style={{ color: subtextColor }}>
              {config.desc}
            </span>
          </div>
        )}
      </header>

      {/* ── SEARCH pill centrada ───────────────────────────────────────────── */}
      {isSectionActive('search') && (
      <section className="max-w-2xl mx-auto px-6 pt-12 pb-6">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: subtextColor }} />
          <input
            type="text"
            placeholder="Buscar en la colección..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '3.25rem',
              backgroundColor: dark ? 'rgba(255,255,255,0.1)' : '#ffffff',
              borderColor: dark ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
              color: textColor,
            }}
            className="w-full pr-6 py-4 rounded-full border shadow-sm text-base outline-none focus:ring-2 focus:ring-[color:var(--c-primary)]/30 transition-all"
          />
        </div>
      </section>
      )}

      {/* ── CHIPS de categoría ─────────────────────────────────────────────── */}
      {isSectionActive('categories') && (
        <nav className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Chip "Todas" */}
          <button
            onClick={() => setSelectedCategory('')}
            className="px-5 py-2 text-sm font-medium rounded-full transition-all border-2"
            style={!selectedCategory
              ? { borderColor: primary, backgroundColor: primary, color: isDarkColor(primary) ? '#ffffff' : '#111827' }
              : { borderColor: 'transparent', color: subtextColor }
            }
          >
            Todas
          </button>

          {/* Categorías */}
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(String(c.id))}
              className="px-5 py-2 text-sm font-medium rounded-full transition-all border-2"
              style={String(selectedCategory) === String(c.id)
                ? { borderColor: primary, backgroundColor: primary, color: isDarkColor(primary) ? '#ffffff' : '#111827' }
                : { borderColor: 'transparent', color: subtextColor }
              }
            >
              {c.name}
            </button>
          ))}

          {/* Separador */}
          <span className="w-px h-5 mx-1" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.15)' : '#e5e7eb' }} />

          {/* Eco chip */}
          {hasSustainability && (
          <button
            onClick={() => setShowEcoOnly(!showEcoOnly)}
            className="px-5 py-2 text-sm font-medium rounded-full transition-all border-2 flex items-center gap-2"
            style={showEcoOnly
              ? { borderColor: '#16a34a', backgroundColor: '#16a34a', color: '#ffffff' }
              : { borderColor: 'transparent', color: subtextColor }
            }
          >
            <Leaf className="w-3.5 h-3.5" />
            Sostenible
          </button>
          )}
        </div>
        </nav>
      )}

      {/* ── PRODUCT GRID ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-lg mb-3" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }} />
                <div className="h-3 rounded w-3/4 mb-2" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }} />
                <div className="h-3 rounded w-1/2" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }} />
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-24 text-center">
            <Package className="w-12 h-12 mx-auto mb-4" style={{ color: subtextColor, opacity: 0.5 }} />
            <p className="text-lg" style={{ color: subtextColor }}>Sin resultados</p>
            <p className="text-sm mt-1" style={{ color: subtextColor, opacity: 0.7 }}>Prueba con otra búsqueda o categoría</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12"
          >
            {sortedProducts.map(product => (
              <motion.div
                key={product.id}
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              >
                <ProductCard
                  product={product}
                  variant="minimal"
                  getItemQuantity={getItemQuantity}
                  handleAddToCart={handleAddToCart}
                  handleQuantityChange={handleQuantityChange}
                  getProductImage={getProductImage}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default LayoutMinimal
