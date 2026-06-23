import API_BASE_URL from '../config/api'

class OrderService {
  // Obtener todas las órdenes
  async getAllOrders() {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  }

  // Actualizar una orden
  async updateOrder(orderId, orderData) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  // Eliminar una orden
  async deleteOrder(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting order:', error)
      throw error
    }
  }

  // Cambiar estado de una orden
  async updateOrderStatus(orderId, newStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  // Obtener detalles de una orden específica
  async getOrderById(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching order details:', error)
      throw error
    }
  }
}

export default new OrderService()