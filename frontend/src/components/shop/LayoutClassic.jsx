import React from 'react'
import { useConfig } from '../../context/ConfigContext'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Search, ShoppingCart, Filter, Leaf, Package, Grid, List } from 'lucide-react'
import Select from '../ui/Select'
import DualRangeSlider from '../ui/DualRangeSlider'
import UserMenu from './UserMenu'
import ProductCard from './ProductCard'
import ProductRow from './ProductRow'
import { isDarkColor, getTextColor, getSubtextColor } from '../../utils/colorUtils'

const LayoutClassic = ({
  searchTerm, setSearchTerm,
  toggleCart, itemCount,
  showUserMenu, setShowUserMenu, userMenuRef,
  selectedCategory, setSelectedCategory, categories,
  priceBounds, priceRange, setPriceRange,
  showEcoOnly, setShowEcoOnly,
  sortedProducts, viewMode, setViewMode,
  sortBy, setSortBy, loading,
  getItemQuantity, handleAddToCart, handleQuantityChange, getProductImage
}) => {
  const config = useConfig();
  const isSectionActive = (key) => config.sections?.[key] !== false;
  const hasSustainability = config?.features?.sustainability !== false;

  const bg      = config.colors?.background || '#f9fafb'
  const primary = config.colors?.primary    || '#2563eb'
  const dark    = isDarkColor(bg)
  const textColor    = getTextColor(bg)
  const subtextColor = getSubtextColor(bg)
  const bgStyle = config.design?.gradient_enabled
    ? `linear-gradient(${config.design.gradient_direction || 'to bottom right'}, ${config.design.gradient_start || bg}, ${config.design.gradient_end || bg})`
    : bg
  const cardBg     = dark ? 'rgba(255,255,255,0.06)' : '#ffffff'
  const cardBorder = dark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb'
  const mutedBg    = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'

  return (
    <div className="layout-classic min-h-screen" style={{ background: bgStyle }}>

      {/* ── HEADER completo ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 shadow-sm"
        style={{
          backgroundColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 flex flex-col gap-0.5">
          <div className="flex items-center gap-3 flex-shrink-0 pt-4">
            {config.logo && (
              <img src={config.logo} alt={config.name} className="h-10 w-auto object-contain" />
            )}
            <span className="font-bold text-lg hidden sm:block" style={{ color: textColor }}>
              {config.design?.header_text || config.name}
            </span>
          </div>
          {config.desc && (
            <span className="text-sm ml-1 mb-2 block max-w-2xl truncate" style={{ color: subtextColor }}>
              {config.desc}
            </span>
          )}
          <div className="flex items-center gap-4 pb-4">
            {/* Barra de búsqueda */}
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: subtextColor }} />
              <input
                type="text"
                placeholder="Buscar en el catálogo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  backgroundColor: dark ? 'rgba(255,255,255,0.1)' : '#f9fafb',
                  borderColor: dark ? 'rgba(255,255,255,0.15)' : '#d1d5db',
                  color: textColor,
                }}
                className="w-full pl-9 pr-4 py-2 text-sm rounded border outline-none focus:border-[color:var(--c-primary)] focus:ring-2 focus:ring-[color:var(--c-primary)]/20 transition-all"
              />
            </div>
            {/* Cart + User */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <button
                onClick={toggleCart}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  color: primary,
                  border: `1px solid ${primary}55`,
                  backgroundColor: `${primary}11`,
                }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = `${primary}22` }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = `${primary}11` }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:block">Carrito</span>
                {itemCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

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
          </div>
        </div>
      </header>

      {/* ── BODY: sidebar + content ───────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 py-8 flex gap-8 items-start">

        {/* ── SIDEBAR (w-64, sticky) ────────────────────────────────────── */}
        {isSectionActive('sidebar') && (
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 self-start">
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${cardBorder}` }}>
              <Filter className="w-4 h-4" style={{ color: subtextColor }} />
              <span className="font-semibold text-sm" style={{ color: textColor }}>Filtros</span>
            </div>

            <div className="p-5 space-y-6">

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: subtextColor }}>
                  Categoría
                </label>
                <Select
                  value={selectedCategory ?? ''}
                  onChange={v => setSelectedCategory(v)}
                  options={[
                    { value: '', label: 'Todas las categorías' },
                    ...categories.map(c => ({ value: c.id, label: c.name }))
                  ]}
                />
              </div>

              {/* Rango de precios */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: subtextColor }}>
                  Precio
                </label>
                <div className="px-1 mb-4">
                  <DualRangeSlider
                    min={priceBounds?.min ?? 0}
                    max={priceBounds?.max ?? 1000}
                    step={1}
                    valueMin={priceRange?.min === '' ? (priceBounds?.min ?? 0) : Number(priceRange?.min)}
                    valueMax={priceRange?.max === '' ? (priceBounds?.max ?? 1000) : Number(priceRange?.max)}
                    onChange={(minVal, maxVal) => setPriceRange({ min: minVal, max: maxVal })}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={`€${priceBounds?.min ?? 0}`}
                    value={priceRange?.min ?? ''}
                    onChange={e => {
                      const val = e.target.value
                      setPriceRange(prev => ({
                        ...prev,
                        min: val === '' ? '' : Math.max(priceBounds?.min ?? 0, Math.min(Number(val), (prev.max === '' ? (priceBounds?.max ?? 1000) : Number(prev.max)) - 1))
                      }))
                    }}
                    style={{ backgroundColor: mutedBg, borderColor: cardBorder, color: textColor }}
                    className="w-full text-xs rounded px-2 py-1.5 border outline-none focus:ring-1 focus:ring-[color:var(--c-primary)]"
                  />
                  <input
                    type="number"
                    placeholder={`€${priceBounds?.max ?? 1000}`}
                    value={priceRange?.max ?? ''}
                    onChange={e => {
                      const val = e.target.value
                      setPriceRange(prev => ({
                        ...prev,
                        max: val === '' ? '' : Math.min(priceBounds?.max ?? 1000, Math.max(Number(val), (prev.min === '' ? (priceBounds?.min ?? 0) : Number(prev.min)) + 1))
                      }))
                    }}
                    style={{ backgroundColor: mutedBg, borderColor: cardBorder, color: textColor }}
                    className="w-full text-xs rounded px-2 py-1.5 border outline-none focus:ring-1 focus:ring-[color:var(--c-primary)]"
                  />
                </div>
              </div>

              {/* Sostenibilidad */}
              {hasSustainability && (
              <div className="pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showEcoOnly}
                      onChange={e => setShowEcoOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-[color:var(--c-primary)]"
                    />
                  </div>
                  <span className="text-sm flex items-center gap-1.5 transition-colors" style={{ color: textColor }}>
                    <Leaf className="w-4 h-4 text-green-500" />
                    Solo Ecológicos
                  </span>
                </label>
              </div>
              )}

            </div>
          </div>
        </aside>
        )}

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* Toolbar: contador + vista + sort */}
          {isSectionActive('toolbar') && (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 rounded-xl shadow-sm px-4 py-3"
            style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm px-2.5 py-1 rounded-md font-medium"
                style={{ color: subtextColor, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}
              >
                {sortedProducts.length} artículos
              </span>
              {/* Toggle grid / list */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', border: `1px solid ${cardBorder}` }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-1.5 transition-colors"
                  style={{
                    backgroundColor: viewMode === 'grid' ? (dark ? 'rgba(255,255,255,0.15)' : '#ffffff') : 'transparent',
                    color: viewMode === 'grid' ? textColor : subtextColor,
                  }}
                  aria-label="Vista cuadrícula"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1.5 transition-colors"
                  style={{
                    backgroundColor: viewMode === 'list' ? (dark ? 'rgba(255,255,255,0.15)' : '#ffffff') : 'transparent',
                    color: viewMode === 'list' ? textColor : subtextColor,
                  }}
                  aria-label="Vista lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sort */}
            <div className="w-full sm:w-52">
              <Select
                value={sortBy}
                onChange={v => setSortBy(v)}
                options={[
                  { value: 'name',       label: 'Nombre A–Z' },
                  { value: 'price_asc',  label: 'Precio: menor primero' },
                  { value: 'price_desc', label: 'Precio: mayor primero' },
                  { value: 'rating',     label: 'Mejor valorados' },
                  ...(hasSustainability ? [{ value: 'eco', label: 'Más ecológicos' }] : []),
                ]}
              />
            </div>
          </div>
          )}

          {/* Loading skeleton y productos */}
          {isSectionActive('products') && (
            loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
                    <div className="aspect-square" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 rounded w-3/4" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }} />
                      <div className="h-3 rounded w-1/2" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }} />
                      <div className="h-7 rounded mt-3" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="rounded-xl border-dashed py-20 text-center" style={{ backgroundColor: cardBg, border: `2px dashed ${cardBorder}` }}>
                <Package className="w-14 h-14 mx-auto mb-4" style={{ color: subtextColor, opacity: 0.5 }} />
                <p className="text-lg font-medium mb-1" style={{ color: textColor }}>No hay artículos</p>
                <p className="text-sm" style={{ color: subtextColor }}>Ajusta los filtros de búsqueda</p>
              </div>
            ) : viewMode === 'grid' ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {sortedProducts.map(product => (
                  <motion.div
                    key={product.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <ProductCard
                      product={product}
                      variant="classic"
                      getItemQuantity={getItemQuantity}
                      handleAddToCart={handleAddToCart}
                      handleQuantityChange={handleQuantityChange}
                      getProductImage={getProductImage}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="space-y-3">
                {sortedProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    config={config}
                    getItemQuantity={getItemQuantity}
                    handleAddToCart={handleAddToCart}
                    handleQuantityChange={handleQuantityChange}
                    getProductImage={getProductImage}
                  />
                ))}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  )
}

export default LayoutClassic
