import API_BASE_URL from '../config/api'

const dashboardService = {
  // obtenemos las estadísticas del dashboard
  getDashboardStats: async () => {
    const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }

    return response.json();
  },

  // obtenemos los datos de ventas
  getSalesData: async (period = 'month') => {
    const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const response = await fetch(`${API_BASE_URL}/dashboard/sales?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener datos de ventas');
    }

    return response.json();
  },

  // obtenemos los datos de categorías
  getCategoryData: async () => {
    const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const response = await fetch(`${API_BASE_URL}/dashboard/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener datos de categorías');
    }

    return response.json();
  },

  // obtenemos los pedidos recientes
  getRecentOrders: async () => {
    const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const response = await fetch(`${API_BASE_URL}/dashboard/orders/recent`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener pedidos recientes');
    }

    return response.json();
  },

  // obtenemos las métricas de sostenibilidad
  getSustainabilityMetrics: async () => {
    const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
    const response = await fetch(`${API_BASE_URL}/dashboard/sustainability`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener métricas de sostenibilidad');
    }

    return response.json();
  }
};

export default dashboardService;