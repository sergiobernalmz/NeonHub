import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Save, Loader, Plus, Trash2, Tag, Check, AlertCircle, Settings } from 'lucide-react'
// ─────────────────────────────────────────────────────────────
// Modal de gestión de categorías (panel aparte)
// ─────────────────────────────────────────────────────────────
const ManageCategoriesModal = ({ categories, onClose, onDeleted, loading, onRefresh }) => {
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const handleDelete = async (id) => {
    setDeletingId(id)
    setError(null)
    try {
      await categoryService.deleteCategory(id)
      setConfirmId(null)
      onDeleted(id)
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Error al borrar la categoría')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60 bg-gradient-to-r from-indigo-900/40 to-purple-900/30">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-semibold text-sm">Gestionar categorías</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* cuerpo */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
            {loading ? (
              <div className="flex justify-center py-8"><Loader className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : categories.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No hay categorías.</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ background: cat.color || '#6366f1' }}></span>
                    <span className="text-white text-sm font-medium">{cat.name}</span>
                  </div>
                  <div>
                    {confirmId === cat.id ? (
                      <>
                        <span className="text-xs text-amber-400 mr-2">¿Borrar?</span>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-xs mr-1"
                          disabled={deletingId === cat.id}
                          onClick={() => handleDelete(cat.id)}
                        >
                          {deletingId === cat.id ? <Loader className="w-3 h-3 animate-spin" /> : 'Sí'}
                        </button>
                        <button
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-2 py-1 text-xs"
                          onClick={() => setConfirmId(null)}
                        >No</button>
                      </>
                    ) : (
                      <button
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Borrar categoría"
                        onClick={() => setConfirmId(cat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cerrar</button>
            <button onClick={onRefresh} className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all">Refrescar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
import { useLanguage } from '../context/LanguageContext'
import { useConfig } from '../context/ConfigContext'
import { categoryService } from '../services/categoryService'
import { uploadService } from '../services/uploadService'
import ImageGallery from './ImageGallery'
import { parseImagesField } from '../utils/imageUtils'

// ─────────────────────────────────────────────────────────────
// mini-modal para crear una categoría nueva sin salir del formulario
// ─────────────────────────────────────────────────────────────
const AddCategoryModal = ({ onClose, onCreated }) => {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await categoryService.createCategory({ name: name.trim(), color })
      onCreated(res.data.category)
    } catch (err) {
      setError(err.message || 'Error al crear la categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60 bg-gradient-to-r from-indigo-900/40 to-purple-900/30">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-semibold text-sm">Nueva categoría</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* cuerpo */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Ej: Electrónica, Ropa, Hogar…"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
              />
              <span className="text-xs text-gray-500 font-mono">{color}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-white/5 transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 text-sm text-white font-medium bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {t('create')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// componente principal del formulario de producto
// ─────────────────────────────────────────────────────────────
const ProductForm = ({ isOpen, onClose, onSubmit, product = null }) => {
  const { t } = useLanguage()
  const config = useConfig()
  const hasSustainability = config?.features?.sustainability !== false
  const hasGallery = config?.features?.gallery !== false
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    stock_quantity: '',
    category_id: '',
    images: [],
    is_active: true,
    sustainability_score: '',
    carbon_footprint: '',
    recyclable: false
  })

  const [categories, setCategories] = useState([])
  const [showImageGallery, setShowImageGallery] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)
  // ── Borrar categoría y refrescar lista ──
  const handleCategoryDeleted = (deletedId) => {
    setCategories(prev => prev.filter(cat => cat.id !== deletedId))
    if (formData.category_id === deletedId) {
      setFormData(prev => ({ ...prev, category_id: '' }))
    }
  }

  // ── reseteamos el formulario cuando cambia el producto o el estado de apertura ──
  useEffect(() => {
    if (product) {
      let productImages = []
      if (product.images) {
        try {
          productImages = parseImagesField(product.images)
        } catch (e) {
          console.warn('Could not parse product images JSON', e)
          productImages = []
        }
      }
      productImages = productImages.map(img => ({
        filename: img.filename || '',
        url: img.url || (img.filename ? uploadService.getImageUrl(img.filename) : ''),
        thumbnailUrl: img.thumbnailUrl || (img.filename ? uploadService.getThumbnailUrl(img.filename) : ''),
        originalName: img.originalName || img.filename || ''
      }))

      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        price: product.price || '',
        stock_quantity: product.stock_quantity || '',
        category_id: product.category_id || '',
        images: productImages,
        is_active: product.is_active ?? true,
        sustainability_score: product.sustainability_score || '',
        carbon_footprint: product.carbon_footprint || '',
        recyclable: product.recyclable || false
      })
    } else {
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: '',
        stock_quantity: '',
        category_id: '',
        images: [],
        is_active: true,
        sustainability_score: '',
        carbon_footprint: '',
        recyclable: false
      })
    }
  }, [product, isOpen])

  // ── cargamos las categorías ──
  const loadCategories = async () => {
    setCategoriesLoading(true)
    try {
      const response = await categoryService.getCategories({ is_active: true })
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadCategories()
  }, [isOpen])

  // ── se llama cuando se crea una categoría nueva en el mini-modal ──
  const handleCategoryCreated = (newCategory) => {
    setShowAddCategory(false)
    setCategories(prev => [...prev, newCategory].sort((a, b) =>
      a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    ))
    setFormData(prev => ({ ...prev, category_id: newCategory.id }))
  }

  const handleInputChange = ({ target: { name, value, type, checked } }) => {
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const generateSKU = () => {
    const prefix = formData.name.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    return `${prefix}-${timestamp}-${randomNum}`
  }

  const handleImageSelect = (selectedImages) => {
    const imageArray = Array.isArray(selectedImages) ? selectedImages : []
    setFormData(prev => ({
      ...prev,
      images: imageArray.map(img => ({
        filename: img.filename,
        url: img.url || uploadService.getImageUrl(img.filename),
        thumbnailUrl: img.thumbnailUrl || uploadService.getThumbnailUrl(img.filename),
        originalName: img.originalName || img.filename
      }))
    }))
  }

  const handleRemoveImage = (filename) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter(img => img.filename !== filename) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const submitData = {
        ...formData,
        sku: formData.sku || generateSKU(),
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_id: formData.category_id || null,
        sustainability_score: formData.sustainability_score ? parseInt(formData.sustainability_score) : null,
        carbon_footprint: formData.carbon_footprint ? parseFloat(formData.carbon_footprint) : null,
        images: formData.images.map(img => ({
          filename: img.filename,
          url: img.url || uploadService.getImageUrl(img.filename),
          thumbnailUrl: img.thumbnailUrl || uploadService.getThumbnailUrl(img.filename),
          originalName: img.originalName || img.filename
        }))
      }
      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* cabecera */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {product ? t('editProduct') : t('newProduct')}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* formulario */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">{t('basicInfo')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('productName')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Ej: Panel Solar 300W"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Se generará automáticamente si se deja vacío"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('description')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Descripción detallada del producto..."
                />
              </div>
            </div>

            {/* precio e inventario */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">{t('pricingInventory')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('price')} (€) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="299.99"
                  />
                </div>

                {/* stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('stock')}</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* ── selector de categoría + botón de añadir ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('category')}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        disabled={categoriesLoading}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-60 appearance-none pr-8"
                      >
                        <option value="">
                          {categoriesLoading ? t('loading') : t('selectCategory')}
                        </option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {categoriesLoading && (
                        <Loader className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400 pointer-events-none" />
                      )}
                    </div>

                    {/* ➕ botón para añadir categoría */}
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      title="Añadir nueva categoría"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all duration-150 shadow-lg shadow-indigo-900/40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {/* ⚙️ botón para gestionar categorías */}
                    <button
                      type="button"
                      onClick={() => setShowManageCategories(true)}
                      title="Gestionar categorías"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-indigo-700 active:scale-95 text-indigo-300 hover:text-white transition-all duration-150"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>

                  {categories.length === 0 && !categoriesLoading && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Sin categorías. Pulsa ➕ para crear una.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* sostenibilidad */}
            {hasSustainability && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Sostenibilidad</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Puntuación de Sostenibilidad (0-100)</label>
                  <input
                    type="number"
                    name="sustainability_score"
                    value={formData.sustainability_score}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="85"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Huella de Carbono (kg CO2)</label>
                  <input
                    type="number"
                    name="carbon_footprint"
                    value={formData.carbon_footprint}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="2.5"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="recyclable"
                  checked={formData.recyclable}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-gray-300">Producto reciclable</label>
              </div>
            </div>
            )}

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-300">{t('productActive')}</label>
            </div>

            {/* imágenes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">{t('images')}</h3>

              {hasGallery && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowImageGallery(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('selectUploadImages')}
                </button>
                <div className="text-sm text-gray-400">Puedes reutilizar imágenes previamente subidas.</div>
              </div>
              )}

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {formData.images && Array.isArray(formData.images) && formData.images.length > 0 ? (
                  formData.images.map(img => (
                    <div key={img.filename} className="relative rounded-md overflow-hidden border border-gray-600">
                      <img src={img.thumbnailUrl || img.url} alt={img.originalName || img.filename} className="w-full h-24 object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(img.filename)} className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">{t('noImagesSelected')}</div>
                )}
              </div>
            </div>

            {/* botones de acción */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center disabled:opacity-50"
              >
                {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {product ? t('update') : t('create')} {t('product')}
              </button>
            </div>
          </form>

          {/* modal de galería de imágenes */}
          <ImageGallery
            isOpen={showImageGallery}
            onClose={() => setShowImageGallery(false)}
            onSelectImages={handleImageSelect}
            selectedImages={formData.images}
            allowMultiple={true}
          />
        </motion.div>
      </div>

      {/* modal de añadir categoría — se renderiza fuera del panel con scroll */}
      <AnimatePresence>
        {showAddCategory && (
          <AddCategoryModal
            onClose={() => setShowAddCategory(false)}
            onCreated={handleCategoryCreated}
          />
        )}
      </AnimatePresence>
      {/* modal de gestión de categorías */}
      <AnimatePresence>
        {showManageCategories && (
          <ManageCategoriesModal
            categories={categories}
            loading={categoriesLoading}
            onClose={() => setShowManageCategories(false)}
            onDeleted={handleCategoryDeleted}
            onRefresh={loadCategories}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default ProductForm