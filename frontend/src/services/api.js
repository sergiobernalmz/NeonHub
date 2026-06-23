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
      handleAuthError(response)
    }

    let errorMessage = 'Error en el servidor'
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch (parseError) {
      console.error('Error parsing error response:', parseError)
    }

    throw new Error(errorMessage)
  }

  try {
    return await response.json()
  } catch (parseError) {
    console.error('Error parsing response:', parseError)
    throw new Error('Error al procesar la respuesta del servidor')
  }
}

// función genérica para hacer peticiones a la API
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    headers: createHeaders(),
    ...options
  }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(url, config)
    return await handleResponse(response)
  } catch (error) {
    console.error(`API Error (${config.method || 'GET'} ${endpoint}):`, error)
    throw error
  }
}

// métodos de la API
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiRequest(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => apiRequest(endpoint, { method: 'PUT', body: data }),
  patch: (endpoint, data) => apiRequest(endpoint, { method: 'PATCH', body: data }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
}

export default api