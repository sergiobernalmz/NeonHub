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

const notificationService = {
  
  async list({ page = 1, limit = 20, isRead, type, category } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(isRead !== undefined ? { isRead: String(isRead) } : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
    });
    const res = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async getUnreadCount() {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async markAsRead(id) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async markAllAsRead() {
    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async remove(id) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handle(res);
  },

  
  async create(payload) {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },
};

export default notificationService;
