const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// ── Configuración de imágenes ──────────────────────────────────
const IMAGE_CONFIG = {
  maxFileSize: 2 * 1024 * 1024,       // 2 MB máximo por archivo
  maxFiles: 10,                         // Máximo 10 archivos por petición
  mainImage: {
    maxWidth: 1024,                     // Resolución estándar para producto
    maxHeight: 1024,
    quality: 80,                        // Buena calidad, buen peso
    format: 'webp',                     // Siempre WebP para máxima compresión
  },
  thumbnail: {
    width: 250,
    height: 250,
    quality: 70,
    format: 'webp',
  },
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
};

// Configuración de almacenamiento
const storage = multer.memoryStorage();

// Filtro para archivos de imagen con validación de magic bytes
const fileFilter = (req, file, cb) => {
  if (IMAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: IMAGE_CONFIG.maxFileSize,
    files: IMAGE_CONFIG.maxFiles
  }
});

// ── Validar magic bytes de la imagen ───────────────────────────
const validateImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;

  return false;
};

// ── Obtener directorio de la tienda ────────────────────────────
const getStoreUploadDir = (storeId) => {
  const baseDir = path.join(__dirname, '../../uploads/products');
  if (!storeId) return baseDir;
  return path.join(baseDir, storeId);
};

const uploadController = {
  // Middleware para subir múltiples imágenes
  uploadImages: upload.array('images', IMAGE_CONFIG.maxFiles),

  // Procesar y guardar imágenes (aisladas por tienda)
  processImages: async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron archivos para subir'
        });
      }

      // Obtener store_id del usuario autenticado
      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: 'Se requiere contexto de tienda para subir imágenes'
        });
      }

      const uploadDir = getStoreUploadDir(storeId);
      const thumbDir = path.join(uploadDir, 'thumbnails');

      // Crear directorios si no existen
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.mkdir(thumbDir, { recursive: true });

      const processedImages = [];

      for (const file of req.files) {
        // Validar magic bytes para seguridad
        if (!validateImageBuffer(file.buffer)) {
          console.warn(`Archivo rechazado por magic bytes inválidos: ${file.originalname}`);
          continue;
        }

        const imageId = uuidv4();
        const filename = `${imageId}.webp`;
        const thumbFilename = `thumb_${imageId}.webp`;

        const imagePath = path.join(uploadDir, filename);
        const thumbPath = path.join(thumbDir, thumbFilename);

        // Procesar imagen principal → siempre WebP optimizado
        await sharp(file.buffer)
          .resize(IMAGE_CONFIG.mainImage.maxWidth, IMAGE_CONFIG.mainImage.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: IMAGE_CONFIG.mainImage.quality })
          .toFile(imagePath);

        // Crear thumbnail en WebP
        await sharp(file.buffer)
          .resize(IMAGE_CONFIG.thumbnail.width, IMAGE_CONFIG.thumbnail.height, {
            fit: 'cover'
          })
          .webp({ quality: IMAGE_CONFIG.thumbnail.quality })
          .toFile(thumbPath);

        // Obtener el tamaño final comprimido
        const compressedStats = await fs.stat(imagePath);

        processedImages.push({
          filename: filename,
          originalName: file.originalname,
          originalSize: file.size,
          compressedSize: compressedStats.size,
          url: `/api/uploads/images/${storeId}/${filename}`,
          thumbnailUrl: `/api/uploads/images/${storeId}/thumbnails/${thumbFilename}`,
          uploadedAt: new Date()
        });
      }

      if (processedImages.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ningún archivo pasó la validación. Asegúrate de subir imágenes válidas (JPEG, PNG, GIF, WebP).'
        });
      }

      res.json({
        success: true,
        message: `${processedImages.length} imagen(es) subida(s) y optimizada(s)`,
        data: {
          images: processedImages
        }
      });

    } catch (error) {
      console.error('Error processing images:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar las imágenes'
      });
    }
  },

  // Servir imágenes estáticas (por tienda)
  serveImage: async (req, res) => {
    try {
      const { storeId, filename } = req.params;
      const { type } = req.query;

      // Sanitizar storeId y filename para evitar path traversal
      if (!storeId || !filename || storeId.includes('..') || filename.includes('..')) {
        return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
      }

      let imagePath;
      if (type === 'thumbnail') {
        imagePath = path.join(__dirname, '../../uploads/products', storeId, 'thumbnails', filename);
      } else {
        imagePath = path.join(__dirname, '../../uploads/products', storeId, filename);
      }

      // Verificar que la ruta resuelta está dentro del directorio de uploads
      const uploadsBase = path.resolve(path.join(__dirname, '../../uploads/products'));
      const resolvedPath = path.resolve(imagePath);
      if (!resolvedPath.startsWith(uploadsBase)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      // Verificar si el archivo existe
      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Todas las imágenes nuevas son WebP
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Type': 'image/webp'
      });

      res.sendFile(resolvedPath);

    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).json({
        success: false,
        message: 'Error al servir la imagen'
      });
    }
  },

  // Servir imágenes legacy (sin storeId, retrocompatibilidad)
  serveImageLegacy: async (req, res) => {
    try {
      const { filename } = req.params;
      const { type } = req.query;

      if (!filename || filename.includes('..')) {
        return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
      }

      let imagePath;
      if (type === 'thumbnail') {
        imagePath = path.join(__dirname, '../../uploads/products/thumbnails', filename);
      } else {
        imagePath = path.join(__dirname, '../../uploads/products', filename);
      }

      const uploadsBase = path.resolve(path.join(__dirname, '../../uploads/products'));
      const resolvedPath = path.resolve(imagePath);
      if (!resolvedPath.startsWith(uploadsBase)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      }

      let contentType = 'image/webp';
      if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.gif')) contentType = 'image/gif';

      res.set({
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Type': contentType
      });

      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Error serving legacy image:', error);
      res.status(500).json({ success: false, message: 'Error al servir la imagen' });
    }
  },

  // Obtener lista de imágenes disponibles (solo de la tienda del usuario)
  getImagesList: async (req, res) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: 'Se requiere contexto de tienda'
        });
      }

      const uploadDir = getStoreUploadDir(storeId);
      const thumbDir = path.join(uploadDir, 'thumbnails');

      let files;
      try {
        files = await fs.readdir(uploadDir);
      } catch (error) {
        return res.json({
          success: true,
          data: { images: [] }
        });
      }

      const images = [];

      for (const file of files) {
        if (!file.toLowerCase().endsWith('.webp') || file.startsWith('thumb_')) continue;

        const filePath = path.join(uploadDir, file);

        try {
          const stats = await fs.stat(filePath);
          // Verificar que es un archivo, no un directorio
          if (!stats.isFile()) continue;

          const imageId = file.replace('.webp', '');
          const thumbFilename = `thumb_${imageId}.webp`;
          const hasThumb = await fs.access(path.join(thumbDir, thumbFilename)).then(() => true).catch(() => false);

          images.push({
            filename: file,
            url: `/api/uploads/images/${storeId}/${file}`,
            thumbnailUrl: hasThumb
              ? `/api/uploads/images/${storeId}/thumbnails/${thumbFilename}`
              : `/api/uploads/images/${storeId}/${file}`,
            size: stats.size,
            uploadedAt: stats.birthtime
          });
        } catch (error) {
          console.error(`Error reading file stats for ${file}:`, error);
        }
      }

      images.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      res.json({
        success: true,
        data: { images }
      });

    } catch (error) {
      console.error('Error getting images list:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de imágenes'
      });
    }
  },

  // Eliminar imagen (solo de la tienda del usuario)
  deleteImage: async (req, res) => {
    try {
      const { filename } = req.params;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: 'Se requiere contexto de tienda'
        });
      }

      if (!filename || filename.includes('..')) {
        return res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
      }

      const uploadDir = getStoreUploadDir(storeId);
      const thumbDir = path.join(uploadDir, 'thumbnails');
      const imagePath = path.join(uploadDir, filename);

      // Verificar que el archivo está dentro del directorio de la tienda
      const uploadsBase = path.resolve(uploadDir);
      const resolvedPath = path.resolve(imagePath);
      if (!resolvedPath.startsWith(uploadsBase)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      // Eliminar imagen principal
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        console.error('Error deleting main image:', error);
      }

      // Eliminar thumbnail correspondiente
      const imageId = filename.replace('.webp', '');
      const thumbPath = path.join(thumbDir, `thumb_${imageId}.webp`);
      try {
        await fs.unlink(thumbPath);
      } catch (error) {
        // Thumbnail podría no existir
      }

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la imagen'
      });
    }
  },

  // Exponer configuración para el frontend
  getImageConfig: (req, res) => {
    res.json({
      success: true,
      data: {
        maxFileSize: IMAGE_CONFIG.maxFileSize,
        maxFileSizeMB: IMAGE_CONFIG.maxFileSize / (1024 * 1024),
        maxFiles: IMAGE_CONFIG.maxFiles,
        allowedTypes: IMAGE_CONFIG.allowedMimeTypes,
        outputFormat: 'webp',
        maxResolution: `${IMAGE_CONFIG.mainImage.maxWidth}x${IMAGE_CONFIG.mainImage.maxHeight}`
      }
    });
  }
};

module.exports = uploadController;