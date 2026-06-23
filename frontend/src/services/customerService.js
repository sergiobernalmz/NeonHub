import API_BASE_URL from '../config/api'

const authHeaders = () => {
  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'))
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

const handle = async (res) => {
  if (!res.ok) {
    let msg = res.statusText
    try { const data = await res.json(); msg = data.message || msg } catch { }
    throw new Error(msg || 'Error de red')
  }
  return res.json()
}

const customerService = {
  async list({ page = 1, limit = 10, search = '', status = '', type = '' } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
      ...(status !== '' ? { status } : {}),
      ...(type ? { type } : {}),
    })
    const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, { headers: authHeaders() })
    return handle(res)
  },
  async get(id) {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, { headers: authHeaders() })
    return handle(res)
  },
  async create(payload) {
    const res = await fetch(`${API_BASE_URL}/customers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
    return handle(res)
  },
  async update(id, payload) {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
    return handle(res)
  },
  async remove(id) {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, { method: 'DELETE', headers: authHeaders() })
    return handle(res)
  },
  async setStatus(id, isActive) {
    const res = await fetch(`${API_BASE_URL}/customers/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive }) })
    return handle(res)
  }
}

export default customerService
