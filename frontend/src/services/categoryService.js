import { handleAuthError } from '../utils/authErrorHandler'
import API_BASE_URL from '../config/api'

// obtenemos el token de autenticación del localStorage
const getAuthToken = () => (sessionStorage.getItem('token') || localStorage.getItem('token'))

// creamos las cabeceras con el token de auth
const createHeaders = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// procesamos la respuesta de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
    if (handleAuthError(errorData)) {
      throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.')
    }
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export const categoryService = {
  // ── GET /api/categories ──────────────────────────────────
  async getCategories(params = {}) {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active)

    const url = `${API_BASE_URL}/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    try {
      const response = await fetch(url, { method: 'GET', headers: createHeaders() })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error al obtener categorías:', error)
      throw error
    }
  },

  // ── POST /api/categories ──────────────────────────────────
  async createCategory(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(data)
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error al crear la categoría:', error)
      throw error
    }
  },

  // ── PUT /api/categories/:id ───────────────────────────────
  async updateCategory(id, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(data)
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error al actualizar la categoría:', error)
      throw error
    }
  },

  // ── DELETE /api/categories/:id ────────────────────────────
  async deleteCategory(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error al borrar la categoría:', error)
      throw error
    }
  }
}

export default categoryService