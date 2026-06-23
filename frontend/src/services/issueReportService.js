import { handleAuthError } from '../utils/authErrorHandler';
import API_BASE_URL from '../config/api'

// obtenemos el token del storage
const getAuthToken = () => {
  return (sessionStorage.getItem('token') || localStorage.getItem('token'));
};

// creamos las cabeceras con el token de autenticación
const createHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// procesamos la respuesta de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (_e) {
      errorData = { message: `Error ${response.status}: ${response.statusText}` };
    }

    // comprobamos si es un error de autenticación
    if (response.status === 401 || response.status === 403) {
      handleAuthError();
    }

    throw new Error(errorData.message || 'Error en la petición');
  }
  return response.json();
};

const issueReportService = {
  
  getReports: async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigned_to_me) params.append('assigned_to_me', filters.assigned_to_me);
      if (filters.created_by_me) params.append('created_by_me', filters.created_by_me);
      if (filters.assigned_role) params.append('assigned_role', filters.assigned_role);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
        method: 'GET',
        headers: createHeaders()
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  },

  
  getReportById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'GET',
        headers: createHeaders()
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  },

  
  createReport: async (reportData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(reportData)
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },

  
  updateReport: async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(updates)
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  },

  
  assignReport: async (id, userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}/assign`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({ assigned_to: userId })
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error assigning report:', error);
      throw error;
    }
  },

  
  addComment: async (id, commentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}/comments`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(commentData)
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  
  getReportStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/stats`, {
        method: 'GET',
        headers: createHeaders()
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error getting report stats:', error);
      throw error;
    }
  },

  
  deleteReport: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'DELETE',
        headers: createHeaders()
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  
  getReportTypes: () => {
    return [
      // Técnicos (IT/Developers)
      { value: 'bug', label: 'Bug/Error', category: 'technical', icon: '🐛', role: 'developer' },
      { value: 'feature_request', label: 'Solicitud de Mejora', category: 'technical', icon: '✨', role: 'developer' },
      { value: 'performance', label: 'Problema de Rendimiento', category: 'technical', icon: '⚡', role: 'developer' },
      { value: 'security', label: 'Problema de Seguridad', category: 'technical', icon: '🔒', role: 'developer' },

      // Soporte (Customer Support)
      { value: 'customer_complaint', label: 'Queja de Cliente', category: 'support', icon: '😞', role: 'support' },
      { value: 'product_issue', label: 'Problema con Producto', category: 'support', icon: '📦', role: 'support' },
      { value: 'return_request', label: 'Solicitud de Devolución', category: 'support', icon: '↩️', role: 'support' },
      { value: 'order_problem', label: 'Problema con Pedido', category: 'support', icon: '🛒', role: 'support' },

      // Ejecutivos (CEO/Management)
      { value: 'financial', label: 'Reporte Financiero', category: 'executive', icon: '💰', role: 'ceo' },
      { value: 'strategic', label: 'Reporte Estratégico', category: 'executive', icon: '📊', role: 'ceo' },
      { value: 'analytics', label: 'Análisis de Datos', category: 'executive', icon: '📈', role: 'manager' },

      // Administrativos
      { value: 'audit', label: 'Auditoría', category: 'administrative', icon: '📋', role: 'admin' },
      { value: 'general', label: 'General', category: 'administrative', icon: '📝', role: 'admin' }
    ];
  },

  
  getPriorities: () => {
    return [
      { value: 'low', label: 'Baja', color: 'gray', icon: '⬇️' },
      { value: 'medium', label: 'Media', color: 'blue', icon: '➡️' },
      { value: 'high', label: 'Alta', color: 'orange', icon: '⬆️' },
      { value: 'critical', label: 'Crítica', color: 'red', icon: '🔥' }
    ];
  },

  
  getStatuses: () => {
    return [
      { value: 'pending', label: 'Pendiente', color: 'gray', icon: '⏳' },
      { value: 'assigned', label: 'Asignado', color: 'blue', icon: '👤' },
      { value: 'in_progress', label: 'En Progreso', color: 'yellow', icon: '🔄' },
      { value: 'resolved', label: 'Resuelto', color: 'green', icon: '✅' },
      { value: 'closed', label: 'Cerrado', color: 'gray', icon: '🔒' },
      { value: 'rejected', label: 'Rechazado', color: 'red', icon: '❌' }
    ];
  }
};

export default issueReportService;
