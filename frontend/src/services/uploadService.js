import API_BASE_URL from '../config/api'

// In Electron (file:// protocol), relative /api/... URLs in <img src> don't
// work because the fetch patch only covers fetch(). We need absolute URLs.
const resolveApiUrl = (relativePath) => {
  if (typeof window !== 'undefined' && window.electron?.isElectron) {
    const backend = window.electron.backendUrl || 'https://api.neonhub.es';
    // /api/uploads/... → https://api.neonhub.es/uploads/...
    return `${backend}${relativePath.replace(/^\/api/, '')}`;
  }
  return relativePath; // web: nginx proxy handles /api/...
};

// ── Configuración de validación frontend ───────────────────────
const IMAGE_LIMITS = {
  maxFileSize: 2 * 1024 * 1024,  // 2 MB
  maxFiles: 10,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
};

// creamos las cabeceras con el token de autenticación
const createHeaders = () => {
  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
  return {
    'Authorization': `Bearer ${token}`
  };
};

// creamos las cabeceras para subida de archivos
const createFileUploadHeaders = () => {
  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
  return {
    'Authorization': `Bearer ${token}`
    // no ponemos Content-Type para FormData, el navegador lo gestiona solo
  };
};

// gestionamos la respuesta de la petición
const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
};

// ── Validar archivos antes de subir ────────────────────────────
const validateFiles = (files) => {
  const errors = [];
  const validFiles = [];

  for (const file of files) {
    if (!IMAGE_LIMITS.allowedTypes.includes(file.type)) {
      errors.push(`"${file.name}": formato no permitido (solo JPEG, PNG, GIF, WebP)`);
      continue;
    }
    if (file.size > IMAGE_LIMITS.maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`"${file.name}": demasiado grande (${sizeMB} MB, máximo 2 MB)`);
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length > IMAGE_LIMITS.maxFiles) {
    errors.push(`Máximo ${IMAGE_LIMITS.maxFiles} archivos por subida`);
    validFiles.splice(IMAGE_LIMITS.maxFiles);
  }

  return { validFiles, errors };
};

export const uploadService = {
  // límites de imagen para mostrar en la UI
  IMAGE_LIMITS,

  // validamos los archivos antes de subirlos
  validateFiles,

  // subimos múltiples imágenes
  async uploadImages(files) {
    try {
      // Validar en frontend antes de enviar
      const { validFiles, errors } = validateFiles(Array.from(files));

      if (validFiles.length === 0) {
        throw new Error(errors.length > 0 ? errors.join('. ') : 'No hay archivos válidos para subir');
      }

      const formData = new FormData();
      for (const file of validFiles) {
        formData.append('images', file);
      }

      const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/uploads/images`, {
        method: 'POST',
        headers: createFileUploadHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `Error ${response.status}: ${response.statusText}`);
        } catch (e) {
          if (e.message.includes('Error ')) throw e;
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }

      const result = await response.json();

      // Adjuntar warnings si hubo archivos rechazados
      if (errors.length > 0) {
        result.warnings = errors;
      }

      return result;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  },

  // obtenemos la lista de imágenes disponibles
  async getImagesList() {
    try {
      const response = await fetch(`${API_BASE_URL}/uploads/images`, {
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error getting images list:', error);
      throw error;
    }
  },

  // eliminamos una imagen
  async deleteImage(filename) {
    try {
      const response = await fetch(`${API_BASE_URL}/uploads/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  },

  // devuelve la URL de la imagen, siempre absoluta para usarla en <img src>
  getImageUrl(filename) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    if (filename.startsWith('/api/')) return resolveApiUrl(filename);
    // nombre de archivo sin ruta (formato antiguo)
    return resolveApiUrl(`/api/uploads/images/${filename}`);
  },

  // devuelve la URL del thumbnail, siempre absoluta para usarla en <img src>
  getThumbnailUrl(filename) {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    if (filename.startsWith('/api/')) return resolveApiUrl(filename);

    if (filename.includes('/thumbnails/')) {
      return resolveApiUrl(`/api${filename.startsWith('/api') ? filename.replace('/api', '') : filename}`);
    }
    if (filename.startsWith('thumb_')) {
      return resolveApiUrl(`/api/uploads/images/thumbnails/${filename}`);
    }
    const base = filename.replace(/\.[^/.]+$/, '');
    return resolveApiUrl(`/api/uploads/images/thumbnails/thumb_${base}.webp`);
  }
};