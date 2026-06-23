import { handleAuthError } from '../utils/authErrorHandler'

import API_BASE_URL from '../config/api'

// obtenemos el token del storage
const getAuthToken = () => {
  return (sessionStorage.getItem('token') || localStorage.getItem('token'))
}

// creamos las cabeceras con el token de autenticación
const createHeaders = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// procesamos la respuesta de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      handleAuthError()
      throw new Error('No autorizado')
    }

    let errorMessage = 'Error en la solicitud'
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      // Si no se puede parsear el JSON, usar el status text
      errorMessage = response.statusText || errorMessage
    }

    throw new Error(errorMessage)
  }
  return response.json()
}

// funciones del servicio de usuarios
export const userService = {
  // obtenemos todos los usuarios con paginación y filtros
  async getUsers(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
    })

    const response = await fetch(`${API_BASE_URL}/users?${params}`, {
      headers: createHeaders()
    })

    return handleResponse(response)
  },

  // creamos un nuevo usuario
  async createUser(userData) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(userData)
    })

    return handleResponse(response)
  },

  // actualizamos un usuario
  async updateUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(userData)
    })

    return handleResponse(response)
  },

  // eliminamos un usuario
  async deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: createHeaders()
    })

    return handleResponse(response)
  },

  // actualizamos el estado del usuario (activar/desactivar)
  async updateUserStatus(userId, isActive) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: createHeaders(),
      body: JSON.stringify({ isActive })
    })

    return handleResponse(response)
  },

  // actualizamos el rol del usuario
  async updateUserRole(userId, roleId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: createHeaders(),
      body: JSON.stringify({ roleId })
    })

    return handleResponse(response)
  },

  // obtenemos los roles disponibles
  async getRoles() {
    const response = await fetch(`${API_BASE_URL}/users/roles`, {
      headers: createHeaders()
    })

    return handleResponse(response)
  }
}

export default userService