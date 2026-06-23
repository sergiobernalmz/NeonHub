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
    let errorData;
    try {
      errorData = await response.json();
      console.log('Error data from server:', errorData);
    } catch (_e) {
      console.log('Could not parse error response as JSON');
      errorData = { message: `Error ${response.status}: ${response.statusText}` };
    }

    // Verificar si es un error de autenticación
    if (response.status === 401 || handleAuthError(errorData)) {
      console.log('Authentication error detected');
      throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }

    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  try {
    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (e) {
    console.error('Error parsing response JSON:', e);
    throw new Error('Error al procesar la respuesta del servidor');
  }
}

export const productService = {
  // obtenemos todos los productos con filtros opcionales
  async getProducts(params = {}) {
    const queryParams = new URLSearchParams()

    // paginación
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)

    // filtros
    if (params.search) queryParams.append('search', params.search)
    if (params.category_id) queryParams.append('category_id', params.category_id)
    if (params.min_price) queryParams.append('min_price', params.min_price)
    if (params.max_price) queryParams.append('max_price', params.max_price)
    if (params.in_stock !== undefined) queryParams.append('in_stock', params.in_stock)
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active)

    // ordenación
    if (params.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params.sort_order) queryParams.append('sort_order', params.sort_order)

    const url = `${API_BASE_URL}/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    console.log(`Requesting products from URL: ${url}`)

    try {
      const token = getAuthToken()
      console.log(`Using auth token: ${token ? 'Present' : 'Not present'}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      })

      console.log(`Response status: ${response.status} ${response.statusText}`)
      if (!response.ok) {
        console.error(`Error response: ${response.status} ${response.statusText}`)
      }

      return await handleResponse(response)
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error(`Error al conectar con el servidor: ${error.message}`)
    }
  },

  // obtenemos un producto por su ID
  async getProductById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  // obtenemos un producto por su SKU
  async getProductBySku(sku) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/sku/${sku}`, {
        method: 'GET',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error fetching product by SKU:', error)
      throw error
    }
  },

  // creamos un nuevo producto
  async createProduct(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(productData)
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  // actualizamos un producto
  async updateProduct(id, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(productData)
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  },

  // actualizamos el stock de un producto
  async updateProductStock(id, stockData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/stock`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify(stockData)
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error updating product stock:', error)
      throw error
    }
  },

  // eliminamos un producto
  async deleteProduct(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  },

  // obtenemos los productos con poco stock
  async getLowStockProducts(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.category_id) queryParams.append('category_id', params.category_id)

    const url = `${API_BASE_URL}/products/low-stock${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      throw error
    }
  }
}

export default productService