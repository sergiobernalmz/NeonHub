import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trash2, Eye, AlertCircle, Search, RefreshCw } from 'lucide-react'
import { uploadService } from '../services/uploadService'
import useToast from '../hooks/useToast'
import { useLanguage } from '../context/LanguageContext'

const ImageGalleryPage = () => {
  const { t } = useLanguage()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredImages, setFilteredImages] = useState([])
  const { showToast } = useToast()

  useEffect(() => {
    loadImages()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredImages(images)
    } else {
      const filtered = images.filter(image => 
        image.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.filename.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredImages(filtered)
    }
  }, [searchTerm, images])

  const loadImages = async () => {
    try {
      setLoading(true)
      const response = await uploadService.getImagesList()
      setImages(response.data.images || [])
      setFilteredImages(response.data.images || [])
    } catch (error) {
      console.error('Error loading images:', error)
      showToast('Error al cargar las imágenes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    const { validFiles, errors } = uploadService.validateFiles(files)

    if (errors.length > 0) {
      errors.forEach(err => showToast(err, 'error'))
    }

    if (validFiles.length === 0) {
      event.target.value = ''
      return
    }

    try {
      setUploading(true)
      const response = await uploadService.uploadImages(validFiles)
      
      setImages(prev => [...response.data.images, ...prev])
      showToast(`${response.data.images.length} imagen(es) optimizada(s) y subida(s)`, 'success')
      
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading images:', error)
      showToast(`Error al subir: ${error.message || 'Error desconocido'}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (filename) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen? Esto podría afectar a los productos que la utilizan.')) {
      return
    }

    try {
      await uploadService.deleteImage(filename)
      setImages(prev => prev.filter(img => img.filename !== filename))
      showToast('Imagen eliminada exitosamente', 'success')
    } catch (error) {
      console.error('Error deleting image:', error)
      showToast('Error al eliminar la imagen', 'error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('imageGallery')}</h1>
          <p className="text-gray-400">
            Administra las imágenes para usar en tus productos
          </p>
        </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder={t('searchImages')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
            
            <button
              onClick={loadImages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('refreshGallery')}
            </button>
            
            <label className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg cursor-pointer transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {uploading ? t('uploading') : t('uploadImages')}
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
              {t('loading')}
            </div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <div className="flex flex-col items-center justify-center">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No se encontraron resultados</h3>
                  <p className="text-gray-400">No hay imágenes que coincidan con "{searchTerm}"</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">{t('noImages')}</h3>
                  <p className="text-gray-400">Sube algunas imágenes para comenzar</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredImages.map((image) => (
              <motion.div
                key={image.filename}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-all group"
              >
                <div className="aspect-square relative">
                  <img
                    src={image.thumbnailUrl 
                      ? uploadService.getThumbnailUrl(image.thumbnailUrl) 
                      : uploadService.getThumbnailUrl(image.filename)}
                    alt={image.originalName || 'Imagen'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = image.url 
                        ? uploadService.getImageUrl(image.url) 
                        : uploadService.getImageUrl(image.filename)
                    }}
                  />
                  
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPreviewImage(image)}
                      className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                      title="Ver imagen"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.filename)}
                      className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Image info */}
                <div className="p-3">
                  <div className="truncate text-white text-sm">
                    {image.originalName || image.filename}
                  </div>
                  <div className="text-gray-400 text-xs mt-1 flex justify-between">
                    <span>{new Date(image.uploadedAt).toLocaleDateString()}</span>
                    {image.size && <span>{(image.size / 1024).toFixed(0)} KB</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium text-white truncate">
                {previewImage.originalName || previewImage.filename}
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewImage.url 
                  ? uploadService.getImageUrl(previewImage.url) 
                  : uploadService.getImageUrl(previewImage.filename)}
                alt={previewImage.originalName || 'Vista previa'}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-between">
              <div className="text-sm text-gray-400">
                Subida el {new Date(previewImage.uploadedAt).toLocaleString()}
              </div>
              <button
                onClick={() => handleDeleteImage(previewImage.filename)}
                className="text-red-500 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ImageGalleryPage