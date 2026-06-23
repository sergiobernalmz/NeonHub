import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Award, Package, X, Check, Search } from 'lucide-react'
import { useToastContext } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
})

const CERT_GRADIENTS = {
  ISO14001:   'from-green-500 to-emerald-600',
  ECOLABEL:   'from-blue-500 to-cyan-600',
  ENERGYSTAR: 'from-yellow-500 to-orange-500',
  FSC:        'from-green-600 to-teal-700',
  C2C:        'from-teal-500 to-cyan-600',
  EPEAT:      'from-blue-600 to-indigo-700',
  OEKOTEX:    'from-purple-500 to-violet-600',
  RFA:        'from-amber-500 to-orange-600',
}

const Certifications = () => {
  const { showSuccess, showError } = useToastContext()
  const { t } = useLanguage()

  const [certs, setCerts]                   = useState([])
  const [certifiedProducts, setCertified]   = useState([])
  const [allProducts, setAllProducts]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [modalProduct, setModalProduct]     = useState(null)
  const [modalCertIds, setModalCertIds]     = useState([])
  const [modalLoading, setModalLoading]     = useState(false)
  const [saving, setSaving]                 = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [certsRes, certProdsRes, prodsRes] = await Promise.all([
        fetch('/api/certifications', { headers: authHeaders() }),
        fetch('/api/certifications/store-products', { headers: authHeaders() }),
        fetch('/api/products?limit=200&is_active=true', { headers: authHeaders() })
      ])
      const [certsData, certProdsData, prodsData] = await Promise.all([
        certsRes.json(), certProdsRes.json(), prodsRes.json()
      ])
      if (certsData.success)     setCerts(certsData.data?.certifications || certsData.data || [])
      if (certProdsData.success) setCertified(certProdsData.data || [])
      if (prodsData.success) {
        const list = prodsData.data?.products || prodsData.data || []
        setAllProducts(list)
      }
    } catch (e) { console.error('Error loading certifications:', e) }
    finally { setLoading(false) }
  }

  const getCertProductCount = (certId) =>
    certifiedProducts.filter(cp => cp.certifications.some(c => c.certificationId === certId)).length

  const getProductCertIds = (productId) => {
    const cp = certifiedProducts.find(c => c.product.id === productId)
    return cp ? cp.certifications.map(c => c.certificationId) : []
  }

  const openModal = async (product) => {
    setModalProduct(product)
    setModalCertIds(getProductCertIds(product.id))
    setModalLoading(false)
  }

  const closeModal = () => { setModalProduct(null); setModalCertIds([]) }

  const handleToggle = async (certificationId) => {
    if (!modalProduct || saving) return
    const isAssigned = modalCertIds.includes(certificationId)
    setSaving(certificationId)
    try {
      if (isAssigned) {
        const res = await fetch(
          `/api/certifications/products/${modalProduct.id}/certifications/${certificationId}`,
          { method: 'DELETE', headers: authHeaders() }
        )
        const data = await res.json()
        if (!data.success) throw new Error(data.message)
        setModalCertIds(prev => prev.filter(id => id !== certificationId))
        showSuccess(t('sealRemoved'))
      } else {
        const res = await fetch(
          `/api/certifications/products/${modalProduct.id}/assign/${certificationId}`,
          { method: 'POST', headers: authHeaders() }
        )
        const data = await res.json()
        if (!data.success) throw new Error(data.message)
        setModalCertIds(prev => [...prev, certificationId])
        showSuccess(t('sealAssigned'))
      }
      await loadData()
    } catch (e) {
      showError(e.message || 'Error al cambiar certificación')
    } finally { setSaving(null) }
  }

  const getProductImage = (product) => {
    const imgs = product.images
    if (Array.isArray(imgs) && imgs.length > 0) return imgs[0]?.url || imgs[0]
    if (typeof imgs === 'string') return imgs
    return null
  }

  const filteredProducts = allProducts.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-400" />
          {t('certificationsTitle')}
        </h1>
        <p className="text-gray-400">{t('certificationsDescription')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
        </div>
      ) : (
        <>
          {/* Sección 1 — Certificaciones disponibles */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
              Sellos disponibles
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {certs.map(cert => {
                const count = getCertProductCount(cert.id)
                const grad = CERT_GRADIENTS[cert.code] || 'from-gray-500 to-gray-600'
                return (
                  <div key={cert.id}
                    className="bg-gray-700/40 border border-gray-600/40 rounded-xl p-4 flex flex-col gap-2">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center`}>
                      <Award className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{cert.name}</p>
                    <p className="text-xs text-gray-400 line-clamp-2 flex-1">{cert.description}</p>
                    <span className={`text-xs font-medium self-start px-2 py-0.5 rounded-full ${
                      count > 0
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'bg-gray-600/40 text-gray-500'
                    }`}>
                      {count} {count === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sección 2 — Todos los productos */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Gestionar por producto
              </h2>
              <span className="text-xs text-gray-500">{allProducts.length} productos</span>
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay productos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {filteredProducts.map(product => {
                  const productCertIds = getProductCertIds(product.id)
                  const img = getProductImage(product)
                  const productCerts = certs.filter(c => productCertIds.includes(c.id))
                  return (
                    <div key={product.id}
                      className="flex items-center gap-3 p-3 bg-gray-700/30 border border-gray-600/30 rounded-xl hover:border-gray-500/50 transition-colors">
                      {/* Imagen */}
                      <div className="w-10 h-10 rounded-lg bg-gray-600 flex-shrink-0 overflow-hidden">
                        {img
                          ? <img src={img} alt={product.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{product.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {productCerts.length > 0
                            ? productCerts.map(c => (
                                <span key={c.id}
                                  className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                                  {c.code}
                                </span>
                              ))
                            : <span className="text-xs text-gray-500">{t('noCertifications')}</span>
                          }
                        </div>
                      </div>
                      {/* Botón */}
                      <button
                        onClick={() => openModal(product)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-600/70 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        {t('assignCertifications')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal — asignar/quitar sellos */}
      {modalProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Sellos de certificación</h3>
                <p className="text-sm text-gray-400 truncate max-w-[16rem]">{modalProduct.name}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {certs.map(cert => {
                const isAssigned = modalCertIds.includes(cert.id)
                const isLoading  = saving === cert.id
                const grad = CERT_GRADIENTS[cert.code] || 'from-gray-500 to-gray-600'
                return (
                  <button
                    key={cert.id}
                    onClick={() => handleToggle(cert.id)}
                    disabled={!!saving}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left disabled:opacity-60 ${
                      isAssigned
                        ? 'bg-amber-400/10 border-amber-400/30'
                        : 'bg-gray-700/40 border-gray-600/40 hover:border-gray-500/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{cert.name}</p>
                      <p className="text-xs text-gray-400 truncate">{cert.issuer}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isAssigned ? 'bg-amber-400 border-amber-400' : 'border-gray-500'
                    }`}>
                      {isLoading
                        ? <div className="w-2.5 h-2.5 rounded-full border border-white border-t-transparent animate-spin" />
                        : isAssigned && <Check className="w-3 h-3 text-white" />
                      }
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

export default Certifications
