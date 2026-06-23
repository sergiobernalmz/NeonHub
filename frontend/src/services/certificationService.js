import api from './api';

export const certificationService = {
  // Obtener todas las certificaciones
  async getCertifications(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/certifications${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo certificaciones:', error);
      throw error;
    }
  },

  // Obtener certificación por ID
  async getCertificationById(id) {
    try {
      const response = await api.get(`/certifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo certificación:', error);
      throw error;
    }
  },

  // Crear nueva certificación
  async createCertification(data) {
    try {
      const response = await api.post('/certifications', data);
      return response.data;
    } catch (error) {
      console.error('Error creando certificación:', error);
      throw error;
    }
  },

  // Actualizar certificación
  async updateCertification(id, data) {
    try {
      const response = await api.put(`/certifications/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando certificación:', error);
      throw error;
    }
  },

  // Eliminar certificación
  async deleteCertification(id) {
    try {
      const response = await api.delete(`/certifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando certificación:', error);
      throw error;
    }
  },

  // Obtener certificaciones de un producto
  async getProductCertifications(productId, activeOnly = true) {
    try {
      const response = await api.get(`/certifications/products/${productId}`, {
        params: { activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo certificaciones del producto:', error);
      throw error;
    }
  },

  // Asignar certificación a producto
  async assignCertificationToProduct(productId, certificationId, data) {
    try {
      const response = await api.post(
        `/certifications/products/${productId}/certifications/${certificationId}`, 
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error asignando certificación:', error);
      throw error;
    }
  },

  // Verificar certificación de producto en tiempo real
  async verifyProductCertification(productId, certificationId) {
    try {
      const response = await api.post(
        `/certifications/products/${productId}/certifications/${certificationId}/verify`
      );
      return response.data;
    } catch (error) {
      console.error('Error verificando certificación:', error);
      throw error;
    }
  },

  // Obtener certificaciones próximas a vencer
  async getExpiringCertifications(days = 30) {
    try {
      const response = await api.get('/certifications/admin/expiring', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo certificaciones por vencer:', error);
      throw error;
    }
  },

  // Actualizar certificaciones expiradas
  async updateExpiredCertifications() {
    try {
      const response = await api.post('/certifications/admin/update-expired');
      return response.data;
    } catch (error) {
      console.error('Error actualizando certificaciones expiradas:', error);
      throw error;
    }
  },

  // Obtener estadísticas del sistema de certificaciones
  async getStats() {
    try {
      const response = await api.get('/certifications/stats');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // Inicializar certificaciones base
  async initializeBaseCertifications() {
    try {
      const response = await api.post('/certifications/admin/initialize');
      return response.data;
    } catch (error) {
      console.error('Error inicializando certificaciones:', error);
      throw error;
    }
  },

  // Verificar todas las certificaciones pendientes
  async verifyAllPending() {
    try {
      const response = await api.post('/certifications/admin/verify-all');
      return response.data;
    } catch (error) {
      console.error('Error verificando certificaciones:', error);
      throw error;
    }
  },

  // Buscar productos por certificación
  async searchProductsByCertification(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/certifications/search/products?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error buscando productos certificados:', error);
      throw error;
    }
  },

  // Funciones de utilidad
  formatCertificationLevel(level) {
    const levels = {
      bronze: { text: 'Bronce', color: 'bg-orange-100 text-orange-800' },
      silver: { text: 'Plata', color: 'bg-gray-100 text-gray-800' },
      gold: { text: 'Oro', color: 'bg-yellow-100 text-yellow-800' },
      platinum: { text: 'Platino', color: 'bg-purple-100 text-purple-800' },
      basic: { text: 'Básico', color: 'bg-blue-100 text-blue-800' },
      premium: { text: 'Premium', color: 'bg-green-100 text-green-800' }
    };

    return levels[level] || { text: level || 'N/A', color: 'bg-gray-100 text-gray-600' };
  },

  formatCertificationType(type) {
    const types = {
      environmental: { text: 'Ambiental', icon: '🌱', color: 'text-green-600' },
      energy: { text: 'Energía', icon: '⚡', color: 'text-yellow-600' },
      quality: { text: 'Calidad', icon: '⭐', color: 'text-blue-600' },
      social: { text: 'Social', icon: '👥', color: 'text-purple-600' },
      organic: { text: 'Orgánico', icon: '🍃', color: 'text-green-500' },
      safety: { text: 'Seguridad', icon: '🛡️', color: 'text-red-600' },
      recycling: { text: 'Reciclaje', icon: '♻️', color: 'text-teal-600' }
    };

    return types[type] || { text: type || 'Otro', icon: '📋', color: 'text-gray-600' };
  },

  formatVerificationStatus(status) {
    const statuses = {
      verified: { text: 'Verificada', color: 'bg-green-100 text-green-800', icon: '✅' },
      unverified: { text: 'Sin verificar', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      error: { text: 'Error', color: 'bg-red-100 text-red-800', icon: '❌' },
      pending: { text: 'Pendiente', color: 'bg-blue-100 text-blue-800', icon: '🔄' }
    };

    return statuses[status] || { text: status || 'Desconocido', color: 'bg-gray-100 text-gray-600', icon: '❓' };
  },

  formatCertificationStatus(status) {
    const statuses = {
      active: { text: 'Activa', color: 'bg-green-100 text-green-800', icon: '✅' },
      expired: { text: 'Expirada', color: 'bg-red-100 text-red-800', icon: '❌' },
      suspended: { text: 'Suspendida', color: 'bg-yellow-100 text-yellow-800', icon: '⏸️' },
      pending: { text: 'Pendiente', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
      revoked: { text: 'Revocada', color: 'bg-red-100 text-red-800', icon: '🚫' }
    };

    return statuses[status] || { text: status || 'Desconocido', color: 'bg-gray-100 text-gray-600', icon: '❓' };
  },

  getDaysUntilExpiry(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  isExpiringSoon(expiryDate, days = 30) {
    return this.getDaysUntilExpiry(expiryDate) <= days;
  },

  isExpired(expiryDate) {
    return this.getDaysUntilExpiry(expiryDate) < 0;
  },

  getExpiryStatusColor(expiryDate) {
    const daysUntilExpiry = this.getDaysUntilExpiry(expiryDate);
    
    if (daysUntilExpiry < 0) return 'text-red-600'; // Expirada
    if (daysUntilExpiry <= 7) return 'text-red-500'; // Crítica
    if (daysUntilExpiry <= 15) return 'text-orange-500'; // Advertencia
    if (daysUntilExpiry <= 30) return 'text-yellow-500'; // Atención
    return 'text-green-600'; // Buena
  },

  // Funciones para trabajar con APIs externas
  getApiStatusText(apiStatus) {
    const statuses = {
      active: 'Conectada',
      inactive: 'Desconectada',
      error: 'Error',
      pending: 'Pendiente'
    };

    return statuses[apiStatus] || 'Desconocido';
  },

  getSystemHealthText(health) {
    const healthStatuses = {
      excellent: 'Excelente',
      good: 'Bueno',
      partial: 'Parcial',
      simulation: 'Simulación'
    };

    return healthStatuses[health] || 'Desconocido';
  },

  getSystemHealthColor(health) {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      partial: 'text-yellow-600',
      simulation: 'text-purple-600'
    };

    return colors[health] || 'text-gray-600';
  }
};

export default certificationService;