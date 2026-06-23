import React, { useRef } from 'react'
import { useConfig } from '../../context/ConfigContext'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { isDarkColor, getBestContrastColor, getTextColor, getSubtextColor } from '../../utils/colorUtils'
import { Search, ShoppingCart, Filter, Leaf, Package, SlidersHorizontal } from 'lucide-react'
import Select from '../ui/Select'
import UserMenu from './UserMenu'
import ProductCard from './ProductCard'

const LayoutModern = ({
  contrastClass, subContrastClass,
  searchTerm, setSearchTerm,
  toggleCart, itemCount,
  showUserMenu, setShowUserMenu, userMenuRef,
  selectedCategory, setSelectedCategory, categories,
  priceRange, setPriceRange, showEcoOnly, setShowEcoOnly,
  sortedProducts, loading,
  getItemQuantity, handleAddToCart, handleQuantityChange, getProductImage
}) => {
  const config = useConfig();
  const collectionRef = useRef(null)
  // evitamos que el grid reanime cada vez que cambian los filtros
  const gridAnimated = useRef(false)
  const bg      = config.colors?.background || '#ffffff'
  const primary = config.colors?.primary    || '#6366f1'
  const accent  = config.colors?.accent     || primary
  const isDark           = isDarkColor(bg)
  const heroTextColor    = getTextColor(bg)
  const heroSubtextColor = getSubtextColor(bg)
  const highlightColor   = getBestContrastColor(bg, primary, accent)
  const hasSustainability = config?.features?.sustainability !== false

  const scrollToCollection = () => {
    collectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper para comprobar si una sección está activa
  const isSectionActive = (key) => config.sections?.[key] !== false;

  return (
    <div className="layout-modern">

      {/* ── NAVBAR flotante glassmorphism ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo + nombre */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {config.logo && (
              <motion.img
                whileHover={{ scale: 1.05 }}
                src={config.logo}
                alt="Logo"
                className="h-9 w-auto object-contain"
              />
            )}
            <span className={`font-bold text-lg tracking-tight ${contrastClass}`}>
              {config.design?.header_text || config.name}
            </span>
          </div>

          {/* Search bar central */}
          {isSectionActive('search') && (
          <div className="hidden md:flex flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-full border outline-none transition-all
                ${isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20'
                  : 'bg-black/5 border-transparent text-gray-900 focus:bg-white focus:border-gray-300 focus:shadow'
                }`}
            />
          </div>
          )}

          {/* Carrito + Usuario */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCart}
              className={`relative p-2.5 rounded-full transition-colors
                ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-black/5'}`}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </motion.button>

            <UserMenu
              showUserMenu={showUserMenu}
              setShowUserMenu={setShowUserMenu}
              userMenuRef={userMenuRef}
              config={config}
              contrastClass={contrastClass}
              subContrastClass={subContrastClass}
              features={config?.features}
            />
          </div>
        </div>
      </header>

      {/* ── HERO Section ──────────────────────────────────────────────────── */}
      {isSectionActive('hero') && (
        <section
          className="relative flex flex-col items-start justify-end pb-16 pt-32 px-6 md:px-12 overflow-hidden"
          style={{ minHeight: '60vh' }}
        >
          {/* Gradiente decorativo de fondo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: config.design?.gradient_enabled
                ? `linear-gradient(135deg, ${config.design.gradient_start || config.colors.primary}33, ${config.design.gradient_end || config.colors.secondary}33)`
                : `radial-gradient(ellipse at 70% 20%, ${config.colors.primary}22 0%, transparent 70%)`
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative max-w-7xl mx-auto w-full"
          >
            <p className="text-sm font-semibold tracking-widest uppercase mb-4"
               style={{ color: heroSubtextColor }}>
              {config.name}
            </p>
            {(() => {
              const heroTitle = config.hero_title || 'Descubre nuestra colección'
              const words = heroTitle.split(' ')
              const lastWord = words.pop()
              const firstPart = words.join(' ')
              return (
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6"
                    style={{ color: heroTextColor }}>
                  {firstPart}<br />
                  <span style={{ color: highlightColor }}>{lastWord}</span>
                </h2>
              )
            })()}
            {(config.hero_subtitle || config.desc) && (
              <p className="text-lg md:text-xl max-w-xl mb-10 font-light"
                 style={{ color: heroSubtextColor }}>
                {config.hero_subtitle || config.desc}
              </p>
            )}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={scrollToCollection}
              className="shop-btn-primary px-8 py-4 text-base font-semibold shadow-lg inline-flex items-center gap-2"
              style={{
                background: highlightColor,
                color: getBestContrastColor(highlightColor, '#ffffff', '#000000'),
              }}
            >
              Ver colección ↓
            </motion.button>
          </motion.div>
        </section>
      )}

      {/* ── FILTERBAR horizontal (sticky) ─────────────────────────────────── */}
      <div
        ref={collectionRef}
        className={`sticky top-16 z-40 glass-header border-t
          ${isDark ? 'border-white/10' : 'border-gray-200/60'}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {/* Categorías */}
          <div className="flex-shrink-0 w-44">
            <Select
              value={selectedCategory ?? ''}
              onChange={v => setSelectedCategory(v)}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          {/* Precio */}
          <div className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-[var(--btn-radius)] border text-sm font-medium
            ${isDark ? 'border-white/20 text-white' : 'border-gray-300 text-gray-700 bg-white'}`}>
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Hasta €{priceRange?.max || '∞'}</span>
            <input
              type="range"
              min={0} max={2000} step={10}
              value={priceRange?.max || 2000}
              onChange={e => setPriceRange(p => ({ ...p, max: Number(e.target.value) }))}
              className="w-20 accent-[color:var(--tw-ring-color)]"
            />
          </div>

          {/* Eco filter */}
          {hasSustainability && (
          <label className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-[var(--btn-radius)] border text-sm font-medium cursor-pointer whitespace-nowrap transition-colors
            ${showEcoOnly
              ? 'border-green-500 bg-green-50 text-green-700'
              : isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}>
            <input type="checkbox" checked={showEcoOnly} onChange={e => setShowEcoOnly(e.target.checked)} className="sr-only" />
            <Leaf className="w-3.5 h-3.5 text-green-500" />
            Solo Eco
          </label>
          )}

          {/* Sort icon info */}
          <div className={`flex items-center gap-2 ml-auto flex-shrink-0 text-sm ${subContrastClass}`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span>{sortedProducts.length} productos</span>
          </div>
        </div>
      </div>

      {/* ── PRODUCT GRID ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse shop-card overflow-hidden bg-gray-200/30">
                <div style={{ paddingBottom: '65%' }} className="bg-gray-200/50" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200/50 rounded w-3/4" />
                  <div className="h-4 bg-gray-200/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-24 text-center">
            <Package className={`w-16 h-16 mx-auto mb-4 ${subContrastClass} opacity-40`} />
            <p className={`text-xl font-medium ${contrastClass}`}>No se encontraron productos</p>
            <p className={`text-sm mt-2 ${subContrastClass}`}>Prueba con otros filtros o búsqueda</p>
          </div>
        ) : (
          <motion.div
            initial={gridAnimated.current ? false : "hidden"}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            onAnimationComplete={() => { gridAnimated.current = true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {sortedProducts.map(product => (
              <motion.div
                key={product.id}
                layout
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
              >
                <ProductCard
                  product={product}
                  variant="modern"
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

export default LayoutModern
