import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Check, Trash2, Eye, Plus } from 'lucide-react'
import { uploadService } from '../services/uploadService'
import useToast from '../hooks/useToast'

const ImageGallery = ({ 
  isOpen, 
  onClose, 
  onSelectImages, 
  selectedImages = [],
  allowMultiple = true,
  allowUpload = true 
}) => {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImageIds, setSelectedImageIds] = useState(selectedImages)
  const [previewImage, setPreviewImage] = useState(null)
  const { showToast } = useToast()

  // cargamos las imágenes cuando se abre el componente
  useEffect(() => {
    if (isOpen) {
      loadImages()
      setSelectedImageIds(selectedImages)
    }
  }, [isOpen, selectedImages])

  const loadImages = async () => {
    try {
      setLoading(true)
      const response = await uploadService.getImagesList()
      setImages(response.data.images || [])
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

    // Validar archivos antes de enviar
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Inicie sesión nuevamente.');
      }
      
      const response = await uploadService.uploadImages(validFiles);
      
      if (response && response.data && response.data.images) {
        setImages(prev => [...response.data.images, ...prev]);
        showToast(`${response.data.images.length} imagen(es) optimizada(s) y subida(s)`, 'success');
      } else {
        throw new Error('Respuesta de servidor inválida');
      }
      
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading images:', error)
      showToast(`Error al subir: ${error.message || 'Error desconocido'}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleImageSelect = (image) => {
    if (allowMultiple) {
      setSelectedImageIds(prev => {
        const isSelected = prev.some(img => img.filename === image.filename)
        if (isSelected) {
          return prev.filter(img => img.filename !== image.filename)
        } else {
          return [...prev, image]
        }
      })
    } else {
      setSelectedImageIds([image])
    }
  }

  const handleDeleteImage = async (filename, event) => {
    event.stopPropagation()
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return
    }

    try {
      await uploadService.deleteImage(filename)
      setImages(prev => prev.filter(img => img.filename !== filename))
      setSelectedImageIds(prev => prev.filter(img => img.filename !== filename))
      showToast('Imagen eliminada exitosamente', 'success')
    } catch (error) {
      console.error('Error deleting image:', error)
      showToast('Error al eliminar la imagen', 'error')
    }
  }

  const handleConfirmSelection = () => {
    onSelectImages(selectedImageIds)
    onClose()
  }

  const isImageSelected = (image) => {
    return selectedImageIds.some(img => img.filename === image.filename)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* cabecera */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Galería de Imágenes
          </h2>
          <div className="flex items-center gap-4">
            {allowUpload && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? 'Optimizando...' : 'Subir (máx 2MB)'}
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* contenido */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Cargando imágenes...</div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Upload className="w-12 h-12 mb-4" />
              <p>No hay imágenes disponibles</p>
              {allowUpload && <p className="text-sm">Sube algunas imágenes para comenzar</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <motion.div
                  key={image.filename}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    isImageSelected(image)
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => handleImageSelect(image)}
                >
                  <div className="aspect-square">
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
                  </div>

                  {/* indicador de selección */}
                  {isImageSelected(image) && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}

                  {/* botones de acción al hacer hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewImage(image)
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteImage(image.filename, e)}
                      className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* info de la imagen */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {image.originalName || image.filename}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* pie del modal */}
        <div className="border-t border-gray-700 p-6 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {selectedImageIds.length > 0 && (
              <span>{selectedImageIds.length} imagen(es) seleccionada(s)</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedImageIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </motion.div>

      {/* modal de previsualización */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url 
                  ? uploadService.getImageUrl(previewImage.url) 
                  : uploadService.getImageUrl(previewImage.filename)}
                alt={previewImage.originalName || 'Preview'}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ImageGallery