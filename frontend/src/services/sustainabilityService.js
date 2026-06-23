import API_BASE_URL from '../config/api'

const authHeaders = () => {
  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handle = async (res) => {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch { }
    throw new Error(msg || 'Error de red');
  }
  return res.json();
};

const sustainabilityService = {
  
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/sustainability/dashboard`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async getCarbonFootprintByProduct() {
    const res = await fetch(`${API_BASE_URL}/sustainability/carbon-footprint`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async getSupplierMetrics() {
    const res = await fetch(`${API_BASE_URL}/sustainability/suppliers`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async getMonthlyComparison() {
    const res = await fetch(`${API_BASE_URL}/sustainability/monthly-comparison`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async recordMetric(metricData) {
    const res = await fetch(`${API_BASE_URL}/sustainability/metrics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(metricData),
    });
    return handle(res);
  },

  
  calculateCO2Savings(conventionalCO2, sustainableCO2, quantity = 1) {
    return Math.max(0, (conventionalCO2 - sustainableCO2) * quantity).toFixed(2);
  },

  
  getSustainabilityScore(product) {
    let score = 50; // puntuación base

    // buscamos palabras clave ecológicas
    const ecoKeywords = ['eco', 'bio', 'organic', 'sostenible', 'ecológico', 'natural'];
    const description = (product.description || '').toLowerCase();
    const name = (product.name || '').toLowerCase();

    ecoKeywords.forEach(keyword => {
      if (description.includes(keyword) || name.includes(keyword)) {
        score += 10;
      }
    });

    // no puede superar 100
    return Math.min(100, score);
  },

  
  getCertificationBadge(product) {
    const description = (product.description || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const text = description + ' ' + name;

    if (text.includes('iso 14001')) return { type: 'ISO 14001', color: 'green' };
    if (text.includes('eu ecolabel')) return { type: 'EU Ecolabel', color: 'blue' };
    if (text.includes('fair trade')) return { type: 'Fair Trade', color: 'orange' };
    if (text.includes('b-corp')) return { type: 'B-Corp', color: 'purple' };
    if (text.includes('eco') || text.includes('bio')) return { type: 'Ecológico', color: 'green' };

    return null;
  },

  // **nuevos métodos para datos reales**

  
  async forceRealTimeUpdate() {
    const response = await fetch(`${API_BASE_URL}/sustainability/real-time/update`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    return handle(response);
  },

  
  async getSystemStatus() {
    const response = await fetch(`${API_BASE_URL}/sustainability/system/status`, {
      method: 'GET',
      headers: authHeaders(),
    });
    return handle(response);
  },

  
  async toggleScheduler(action) {
    const response = await fetch(`${API_BASE_URL}/sustainability/system/scheduler`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action }),
    });
    return handle(response);
  },

  
  async getApiConfiguration() {
    const response = await fetch(`${API_BASE_URL}/sustainability/system/config`, {
      method: 'GET',
      headers: authHeaders(),
    });
    return handle(response);
  },

  
  async recordMetric(metricData) {
    const response = await fetch(`${API_BASE_URL}/sustainability/metrics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(metricData),
    });
    return handle(response);
  }
};

export default sustainabilityService;