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
    const errorData = await response.json().catch(() => ({}))

    // gestionamos errores de autenticación
    if (response.status === 401) {
      handleAuthError(errorData)
      throw new Error(errorData.message || 'No autorizado')
    }

    throw new Error(errorData.message || `Error: ${response.status}`)
  }

  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch (_e) {
    console.error('Error parsing JSON:', text)
    throw new Error('JSON inválido')
  }
}

export const cartService = {
  // obtenemos el carrito del usuario actual
  async getCart() {
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'GET',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error fetching cart:', error)
      throw error
    }
  },

  // añadimos un artículo al carrito
  async addItem(productId, quantity = 1, metadata = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({
          product_id: productId,
          quantity,
          metadata
        })
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error adding item to cart:', error)
      throw error
    }
  },

  // actualizamos la cantidad de un artículo
  async updateItem(itemId, quantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify({ quantity })
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error updating cart item:', error)
      throw error
    }
  },

  // eliminamos un artículo del carrito
  async removeItem(itemId) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error removing cart item:', error)
      throw error
    }
  },

  // vaciamos todos los artículos del carrito en el backend
  async clearCart() {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: createHeaders()
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error clearing cart:', error)
      throw error
    }
  },

  // procesamos el checkout del carrito
  async checkout(shippingAddress, discountId = null, discountCode = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/checkout`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({
          shipping_address: shippingAddress || null,
          discount_id: discountId,
          discount_code: discountCode
        })
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error during checkout:', error)
      throw error
    }
  },

  // creamos un Payment Intent de Stripe para un pedido existente
  async createPaymentIntent(orderId, amount) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({ orderId, amount })
      })
      return await handleResponse(response)
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw error
    }
  },

  // sincronizamos el carrito local con el servidor (al hacer login/registro)
  async syncLocalCart(localItems) {
    try {
      const promises = localItems.map(item =>
        this.addItem(item.id, item.quantity, item.metadata || {})
      )
      await Promise.allSettled(promises)
      const cart = await this.getCart()
      return cart
    } catch (error) {
      console.error('Error syncing local cart:', error)
      throw error
    }
  }
}

export default cartService
