import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfig, useSetConfig } from '../context/ConfigContext'
import CartSidebar from '../components/CartSidebar'
import API_BASE_URL from '../config/api'

import CSSVariables from '../components/shop/CSSVariables'
import AnnouncementBanner from '../components/shop/AnnouncementBanner'
import ShopFooter from '../components/shop/ShopFooter'
import LayoutModern from '../components/shop/LayoutModern'
import LayoutMinimal from '../components/shop/LayoutMinimal'
import LayoutClassic from '../components/shop/LayoutClassic'

// Helper — calcular contraste de texto sobre un fondo hex
function getContrastYIQ(hexcolor) {
  if (!hexcolor) return 'text-gray-900'
  let h = hexcolor.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6) return 'text-gray-900'
  const r = parseInt(h.substr(0, 2), 16)
  const g = parseInt(h.substr(2, 2), 16)
  const b = parseInt(h.substr(4, 2), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? 'text-gray-900' : 'text-white'
}

export function buildConfig(tenant = {}) {
  const settings = tenant.settings || {}
  const branding = settings.branding || {}
  const theme    = settings.theme   || {}
  const design   = settings.design  || {}
  return {
    subdomain:        tenant.subdomain                      || null,
    name:             tenant.name                           || 'EcoCommerce',
    dashboardName:    branding.dashboard_name               || null,
    desc:             branding.store_description            || 'Productos ecológicos y sostenibles',
    logo:             branding.logo_url                     || null,
    favicon:          branding.favicon_url                  || null,
    dashboard_logo:   branding.dashboard_logo_url           || null,
    dashboard_favicon: branding.dashboard_favicon_url       || null,
    hero_title:       branding.hero_title                   || null,
    hero_subtitle:    branding.hero_subtitle                || null,
    colors: {
      primary:    branding.primary_color || theme.primaryColor || '#2563eb',
      secondary:  branding.secondary_color                     || '#4f46e5',
      accent:     branding.accent_color                        || '#06b6d4',
      background: branding.bg_color                            || '#ffffff',
    },
    design,
    sections: tenant.settings?.enterprise_config?.sections || tenant.sections || {},
    features: tenant.features || {},
    plan:          tenant.plan          || 'starter',
    trial_ends_at: tenant.trial_ends_at || null,
    trial_active:  tenant.trial_active  || false,
    url_mapping:   tenant.url_mapping   || null,
  }
}

const Shop = () => {
  const { addItem, getItemQuantity, updateQuantity, toggleCart, itemCount } = useCart()
  // eslint-disable-next-line no-unused-vars
  const { user, logout } = useAuth()
  const { showError } = useToast()
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate()

  const config = useConfig()
  const setConfig = useSetConfig()

  // favicon dinámico si cambia la config
  useEffect(() => {
    if (!config?.favicon) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = config.favicon
  }, [config?.favicon])

  // postMessage — actualización desde el panel admin en iframe preview
  useEffect(() => {
    const handler = (event) => {
      if (!event.data || event.data.type !== 'SHOP_PREVIEW_UPDATE') return
      const payload = event.data.payload
      setConfig(prev => ({
        ...prev,
        ...payload,
        colors:   { ...prev.colors,   ...payload.colors   },
        design:   { ...prev.design,   ...payload.design   },
        sections: { ...prev.sections, ...payload.sections },
        features: { ...prev.features, ...payload.features },
      }))
      if (payload.favicon) {
        let link = document.querySelector("link[rel~='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = payload.favicon
      }
    }
    window.addEventListener('message', handler)
    if (window.parent) window.parent.postMessage({ type: 'SHOP_PREVIEW_READY' }, '*')
    return () => window.removeEventListener('message', handler)
  }, [setConfig])
  // cargar config desde la API si no viene del servidor
  useEffect(() => {
    if (window.__TENANT_CONFIG__ && Object.keys(window.__TENANT_CONFIG__).length > 0) return
    const params   = new URLSearchParams(window.location.search)
    const tenantId = params.get('tenant') || window.location.hostname.split('.')[0]
    if (!tenantId || tenantId === 'localhost') return

    const load = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/public/tenant-config?subdomain=${tenantId}`)
        const data = await res.json()
        if (data.success) setConfig(buildConfig(data.data))
      } catch (err) {
        console.error('Error loading tenant config:', err)
      }
    }
    load()
  }, [setConfig])

  const contrastClass    = getContrastYIQ(config.colors.background)
  const subContrastClass = contrastClass === 'text-white' ? 'text-gray-300' : 'text-gray-600'

  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_BASE_URL}/public/products`).then(r => r.json()),
          fetch(`${API_BASE_URL}/public/categories`).then(r => r.json()),
        ])

        const prodData = Array.isArray(prodRes) ? prodRes
          : Array.isArray(prodRes.data?.products) ? prodRes.data.products
          : Array.isArray(prodRes.data)           ? prodRes.data
          : []

        const catData = Array.isArray(catRes) ? catRes
          : Array.isArray(catRes.data?.categories) ? catRes.data.categories
          : Array.isArray(catRes.data)             ? catRes.data
          : []

        if (!isMounted) return
        setProducts(prodData)
        setCategories(catData)

        if (prodData.length) {
          const prices = prodData.map(p => Number(p.price)).filter(n => !isNaN(n) && isFinite(n))
          if (prices.length) {
            const minP = Math.max(0, Math.floor(Math.min(...prices)))
            const rawMax = Math.ceil(Math.max(...prices))
            const maxP = rawMax === minP ? minP + 1 : rawMax
            setPriceBounds({ min: minP, max: maxP })
            setPriceRange(prev => {
              const prevMin = prev.min === '' ? minP : Number(prev.min)
              const prevMax = prev.max === '' ? maxP : Number(prev.max)
              let newMin = isNaN(prevMin) ? minP : prevMin
              let newMax = isNaN(prevMax) ? maxP : prevMax
              newMin = Math.min(Math.max(newMin, minP), maxP - 1)
              newMax = Math.max(Math.min(newMax, maxP), minP + 1)
              if (newMin >= newMax) newMin = Math.max(minP, newMax - 1)
              return { min: newMin, max: newMax }
            })
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        showError('Error al cargar los productos')
        if (!isMounted) return
        setProducts([])
        setCategories([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [searchTerm,       setSearchTerm]       = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange,       setPriceRange]       = useState({ min: '', max: '' })
  const [priceBounds,      setPriceBounds]      = useState({ min: 0, max: 1000 })
  const [sortBy,           setSortBy]           = useState('name')
  const [viewMode,         setViewMode]         = useState('grid')
  const [showEcoOnly,      setShowEcoOnly]      = useState(false)

  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target))
        setShowUserMenu(false)
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  const handleAddToCart = useCallback((product) => {
    if (product.stock_quantity <= 0) { showError('Producto sin stock'); return }
    addItem(product)
  }, [addItem, showError])

  const handleQuantityChange = useCallback((product, change) => {
    const current = getItemQuantity(product.id)
    const next    = current + change
    if (next <= 0)                             updateQuantity(product.id, 0)
    else if (next <= product.stock_quantity)    updateQuantity(product.id, next)
    else                                         showError('Stock insuficiente')
  }, [getItemQuantity, updateQuantity, showError])

  const getProductImage = useCallback((product) => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0)
      return product.images[0].thumbnailUrl || product.images[0].url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f1f5f9"/%3E%3Cpath d="M35 40h30v25H35z" fill="%23cbd5e1"/%3E%3Ccircle cx="58" cy="38" r="5" fill="%23cbd5e1"/%3E%3C/svg%3E'
  }, [])

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return []
    return products.filter(product => {
      const name = product.name?.toLowerCase() || ''
      const desc = product.description?.toLowerCase() || ''
      const term = searchTerm.toLowerCase()
      const matchesSearch   = name.includes(term) || desc.includes(term)
      const matchesCategory = !selectedCategory || String(product.category_id) === String(selectedCategory)
      const minVal  = priceRange.min === '' ? null : Number(priceRange.min)
      const maxVal  = priceRange.max === '' ? null : Number(priceRange.max)
      const pNum    = Number(product.price)
      const matchesPrice = (minVal === null || pNum >= minVal) && (maxVal === null || pNum <= maxVal)
      const matchesEco   = !showEcoOnly || product.eco_friendly
      return matchesSearch && matchesCategory && matchesPrice && matchesEco
    })
  }, [products, searchTerm, selectedCategory, priceRange, showEcoOnly])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return parseFloat(a.price)  - parseFloat(b.price)
        case 'price_desc': return parseFloat(b.price)  - parseFloat(a.price)
        case 'name':       return (a.name || '').localeCompare(b.name || '')
        case 'rating':     return (b.rating || 0)                  - (a.rating || 0)
        case 'eco':
          if (config?.features?.sustainability === false) return new Date(b.created_at) - new Date(a.created_at)
          return (b.sustainability_score || 0) - (a.sustainability_score || 0)
        default:           return 0
      }
    })
  }, [filteredProducts, sortBy])

  const sharedProps = {
    contrastClass, subContrastClass,
    searchTerm, setSearchTerm,
    toggleCart, itemCount,
    showUserMenu, setShowUserMenu, userMenuRef,
    selectedCategory, setSelectedCategory, categories,
    priceBounds, priceRange, setPriceRange,
    showEcoOnly, setShowEcoOnly,
    sortedProducts, viewMode, setViewMode,
    sortBy, setSortBy, loading,
    getItemQuantity, handleAddToCart, handleQuantityChange, getProductImage,
  }

  const layout = config.design?.layout

  const renderLayout = () => {
    if (layout === 'modern')  return <LayoutModern  {...sharedProps} />
    if (layout === 'minimal') return <LayoutMinimal {...sharedProps} />
    return <LayoutClassic {...sharedProps} />
  }

  return (
    <>
      <CSSVariables config={config} />
      <div className="shop-root tenant-theme transition-colors duration-300">
        {config.sections?.announcement !== false && config.design?.announcement_text && (
          <AnnouncementBanner config={config} />
        )}
        {config.subdomain === 'demo' && (
          <div style={{
            background: '#1e3a5f', color: '#93c5fd',
            padding: '8px 16px', textAlign: 'center', fontSize: '13px',
          }}>
            🧪 Tienda de demostración — Los pagos usan tarjeta de prueba:{' '}
            <strong style={{ fontFamily: 'monospace' }}>4242 4242 4242 4242</strong>
            {' '}· Cualquier fecha futura · Cualquier CVC
          </div>
        )}
        {renderLayout()}
        <CartSidebar />
        <ShopFooter config={config} contrastClass={contrastClass} subContrastClass={subContrastClass} />
      </div>
    </>
  )
}

export default Shop