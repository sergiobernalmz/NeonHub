import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Filter, Package, Leaf, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useConfig } from '../context/ConfigContext'
import ProductForm from '../components/ProductForm'
import CertificationBadges from '../components/CertificationBadges'
import { productService } from '../services/productService'
import { parseImagesField } from '../utils/imageUtils'
import { uploadService } from '../services/uploadService'

const Products = () => {
  const { t } = useLanguage()
  const config = useConfig()
  const hasSustainability = config?.features?.sustainability !== false
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    category_id: '',
    in_stock: true,
    is_active: true
  })

  // cargamos los productos al montar el componente
  useEffect(() => {
    loadProducts()
  }, [filters])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Iniciando carga de productos...')

      const params = {
        search: searchTerm,
        ...filters,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
      console.log('Parámetros de búsqueda:', params)

      // Añadir un timeout para evitar bloqueos indefinidos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000)
      );

      const fetchPromise = productService.getProducts(params);

      // Usar Promise.race para implementar un timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('Respuesta recibida:', response)

      setProducts(response.data.products || [])
      console.log('Productos cargados:', response.data.products ? response.data.products.length : 0)
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err.message || 'Error al cargar productos. Comprueba la conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (productData) => {
    try {
      await productService.createProduct(productData)
      await loadProducts() // recargamos los productos
      setIsFormOpen(false)
    } catch (err) {
      console.error('Error creating product:', err)
      throw err
    }
  }

  const handleUpdateProduct = async (productData) => {
    try {
      // nos aseguramos de que las imágenes tienen el formato correcto (puede venir como string desde la API)
      const formattedData = {
        ...productData,
        // Asegurar que las imágenes estén en el formato correcto
        images: Array.isArray(productData.images) ? productData.images : []
      };

      console.log("Updating product with data:", formattedData);

      await productService.updateProduct(editingProduct.id, formattedData)
      await loadProducts() // recargamos los productos
      setEditingProduct(null)
      setIsFormOpen(false)
    } catch (err) {
      console.error('Error updating product:', err)
      throw err
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await productService.deleteProduct(productId)
        await loadProducts() // recargamos los productos
      } catch (err) {
        console.error('Error deleting product:', err)
        alert('Error al eliminar el producto: ' + err.message)
      }
    }
  }

  const handleSearch = () => {
    loadProducts()
  }

  const openCreateForm = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const openEditForm = (product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('productsTitle')}</h1>
          <p className="text-gray-400">{t('productsDescription')}</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center mt-4 sm:mt-0"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('newProduct')}
        </button>
      </div>

      {/* filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center"
          >
            <Search className="w-5 h-5 mr-2" />
            {t('search')}
          </button>
        </div>
      </div>

      {/* estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-400">{t('loadingProducts')}</span>
        </div>
      )}

      {/* estado de error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 flex items-center">
          <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
          <div>
            <h3 className="text-red-400 font-medium">{t('errorLoadingProducts')}</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
            <button
              onClick={loadProducts}
              className="text-red-400 hover:text-red-300 text-sm underline mt-2"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      )}

      {/* cuadrícula de productos */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">{t('noProductsFound')}</h3>
              <p className="text-gray-500 mb-4">{t('startCreatingProduct')}</p>
              <button
                onClick={openCreateForm}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('newProduct')}
              </button>
            </div>
          ) : (
            products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 transition-transform duration-200"
              >
                <div className="aspect-square bg-gray-700/30 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {product.images ? (
                    (() => {
                      // parseamos las imágenes si vienen en formato string
                      let imagesArray = [];
                      try {
                        imagesArray = parseImagesField(product.images);
                        console.log(`Imágenes procesadas para ${product.name}:`, imagesArray);
                      } catch (e) {
                        console.warn(`Error parsing product images for ${product.name}:`, e);
                        console.warn("Original value:", product.images);
                        imagesArray = [];
                      }

                      return imagesArray && imagesArray.length > 0 ? (
                        <img
                          src={uploadService.getImageUrl(imagesArray[0].thumbnailUrl || imagesArray[0].url || imagesArray[0].filename)}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const fallback = uploadService.getImageUrl(imagesArray[0].url || imagesArray[0].filename);
                            if (fallback && e.target.src !== fallback) {
                              e.target.src = fallback;
                            } else {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<span class="text-gray-400">Sin imagen</span>';
                            }
                          }}
                        />
                      ) : (
                        <Package className="w-16 h-16 text-gray-400" />
                      );
                    })()
                  ) : (
                    <Package className="w-16 h-16 text-gray-400" />
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-200 mb-2">{product.name}</h3>
                <p className="text-gray-400 text-sm mb-1">{product.category?.name || 'Sin categoría'}</p>
                <p className="text-gray-500 text-xs mb-3">SKU: {product.sku}</p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-green-400">{formatPrice(product.price)}</span>
                  {hasSustainability && product.sustainability_score && (
                    <div className="flex items-center space-x-1">
                      <Leaf className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">{product.sustainability_score}%</span>
                    </div>
                  )}
                </div>

                {/* Certificaciones */}
                <div className="mb-3">
                  <CertificationBadges productId={product.id} displayMode="compact" maxBadges={3} />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm ${product.stock_quantity > 10 ? 'text-green-400' :
                    product.stock_quantity > 0 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    {t('stock')}: {product.stock_quantity}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${product.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                    {product.is_active ? t('active') : t('inactive')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => openEditForm(product)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* modal del formulario de producto */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingProduct(null)
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        product={editingProduct}
      />
    </motion.div>
  )
}

export default Products