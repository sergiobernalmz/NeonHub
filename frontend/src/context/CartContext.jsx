import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react'
import { useToast } from './ToastContext'
import cartService from '../services/cartService'

const CartContext = createContext()

// Estado inicial del carrito
const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  isOpen: false,
  customer: null,
  shippingAddress: null,
  paymentMethod: null,
  backendCartId: null,
  appliedDiscount: null
}

// Acciones del carrito
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id)

      if (existingItem) {
        // Si el producto ya existe, aumentar cantidad
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems),
          itemCount: calculateItemCount(updatedItems)
        }
      } else {
        // Si es un producto nuevo, agregarlo
        const newItems = [...state.items, { ...action.payload, quantity: 1 }]
        return {
          ...state,
          items: newItems,
          total: calculateTotal(newItems),
          itemCount: calculateItemCount(newItems)
        }
      }
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload.id)
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
        itemCount: calculateItemCount(updatedItems)
      }
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(0, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0) // Remover items con cantidad 0

      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
        itemCount: calculateItemCount(updatedItems)
      }
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
        appliedDiscount: null
      }

    case 'SET_APPLIED_DISCOUNT':
      return {
        ...state,
        appliedDiscount: action.payload
      }

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen
      }

    case 'SET_CART_OPEN':
      return {
        ...state,
        isOpen: action.payload
      }

    case 'SET_CUSTOMER':
      return {
        ...state,
        customer: action.payload
      }

    case 'SET_SHIPPING_ADDRESS':
      return {
        ...state,
        shippingAddress: action.payload
      }

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload
      }

    case 'LOAD_CART':
      return {
        ...state,
        ...action.payload,
        total: calculateTotal(action.payload.items || []),
        itemCount: calculateItemCount(action.payload.items || [])
      }

    case 'SET_BACKEND_CART_ID':
      return {
        ...state,
        backendCartId: action.payload
      }

    default:
      return state
  }
}

// Funciones auxiliares
const calculateTotal = (items) => {
  return items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0)
}

const calculateItemCount = (items) => {
  return items.reduce((count, item) => count + item.quantity, 0)
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { showSuccess, showError } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingBackendCart, setIsLoadingBackendCart] = useState(false)
  const hasInitializedAuth = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    setIsAuthenticated(!!token)
    if (token) loadBackendCart()
  }, [])

  // limpiamos el carrito cuando el usuario cierra sesión (saltamos el render inicial)
  useEffect(() => {
    if (!hasInitializedAuth.current) {
      hasInitializedAuth.current = true
      return
    }
    if (!isAuthenticated) {
      dispatch({ type: 'CLEAR_CART' })
      localStorage.removeItem('ecommerce_cart')
    }
  }, [isAuthenticated])

  // escuchamos cambios en el storage para detectar login/logout en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        const token = e.newValue
        const wasAuthenticated = isAuthenticated
        setIsAuthenticated(!!token)

        if (token && !wasAuthenticated) {
          loadBackendCart()
        } else if (!token && wasAuthenticated) {
          dispatch({ type: 'CLEAR_CART' })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isAuthenticated])

  const loadBackendCart = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token || isLoadingBackendCart) return

    setIsLoadingBackendCart(true)
    try {
      const response = await cartService.getCart()
      const backendCart = response.data || response
      if (backendCart && backendCart.items) {
        const items = backendCart.items.map(item => ({
          id: item.product_id,
          name: item.product?.name || 'Product',
          price: item.unit_price || item.product?.price || 0,
          quantity: item.quantity,
          image: item.product?.image_url,
          stock: item.product?.stock
        }))

        dispatch({
          type: 'LOAD_CART',
          payload: {
            items,
            backendCartId: backendCart.id
          }
        })
      }
    } catch (error) {
      console.error('Error loading backend cart:', error)
      // si falla, intentamos cargar del localStorage como fallback
      const savedCart = localStorage.getItem('ecommerce_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          dispatch({ type: 'LOAD_CART', payload: cartData })
        } catch (parseError) {
          console.error('Error parsing localStorage cart:', parseError)
        }
      }
    } finally {
      setIsLoadingBackendCart(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      loadBackendCart()
    } else {
      const savedCart = localStorage.getItem('ecommerce_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          dispatch({ type: 'LOAD_CART', payload: cartData })
        } catch (error) {
          console.error('Error loading cart from localStorage:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('ecommerce_cart', JSON.stringify(state))
    }
  }, [state, isAuthenticated])

  // Acciones del carrito
  const addItem = async (product) => {
    dispatch({ type: 'ADD_ITEM', payload: product })
    showSuccess(`${product.name} agregado al carrito`)

    // sincronizamos con el backend si el usuario está autenticado
    if (isAuthenticated) {
      try {
        await cartService.addItem(product.id, 1)
      } catch (error) {
        console.error('Error syncing add to backend:', error)
        // mostramos éxito igualmente, el item ya está en el estado local
      }
    }
  }

  const removeItem = async (productId) => {
    const item = state.items.find(item => item.id === productId)
    dispatch({ type: 'REMOVE_ITEM', payload: { id: productId } })
    if (item) {
      showSuccess(`${item.name} eliminado del carrito`)
    }

    // sincronizamos con el backend si el usuario está autenticado
    if (isAuthenticated && state.backendCartId) {
      try {

        const response = await cartService.getCart()
        const backendItem = response.data?.items?.find(i => i.product_id === productId)
        if (backendItem) {
          await cartService.removeItem(backendItem.id)
        }
      } catch (error) {
        console.error('Error syncing remove to backend:', error)
      }
    }
  }

  const updateQuantity = async (productId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } })

    // sincronizamos con el backend si el usuario está autenticado
    if (isAuthenticated && state.backendCartId) {
      try {
        const response = await cartService.getCart()
        const backendItem = response.data?.items?.find(i => i.product_id === productId)
        if (backendItem) {
          if (quantity > 0) {
            await cartService.updateItem(backendItem.id, quantity)
          } else {
            await cartService.removeItem(backendItem.id)
          }
        }
      } catch (error) {
        console.error('Error syncing quantity to backend:', error)
      }
    }
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
    showSuccess('Carrito vaciado')
  }

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' })
  }

  const setCartOpen = (isOpen) => {
    dispatch({ type: 'SET_CART_OPEN', payload: isOpen })
  }

  const setCustomer = (customer) => {
    dispatch({ type: 'SET_CUSTOMER', payload: customer })
  }

  const setShippingAddress = (address) => {
    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: address })
  }

  const setPaymentMethod = (method) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method })
  }

  const setAppliedDiscount = (discount) => {
    dispatch({ type: 'SET_APPLIED_DISCOUNT', payload: discount })
  }

  // Función para procesar el pedido
  const processOrder = async (shippingFormData) => {
    const addressToUse = shippingFormData || state.shippingAddress
    try {
      if (state.items.length === 0) {
        showError('El carrito está vacío')
        return false
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      if (token) {
        try {
          // sincronizamos el estado de React con el carrito del backend antes del checkout
          await cartService.clearCart()
          for (const item of state.items) {
            await cartService.addItem(item.productId || item.id, item.quantity)
          }

          // Paso 1: crear la orden desde el carrito
          const checkoutResult = await cartService.checkout(
            addressToUse,
            state.appliedDiscount?.discount_id || null,
            state.appliedDiscount?.code || null
          )
          const order = checkoutResult.data?.order || checkoutResult.order
          if (!order?.id) throw new Error('No se pudo crear el pedido')

          // Paso 2: crear Payment Intent en Stripe
          const paymentResult = await cartService.createPaymentIntent(order.id, order.total_amount)
          const clientSecret = paymentResult.data?.clientSecret || paymentResult.clientSecret
          if (!clientSecret) throw new Error('No se pudo iniciar el pago')

          dispatch({ type: 'SET_APPLIED_DISCOUNT', payload: null })

          return { clientSecret, order }
        } catch (error) {
          console.error('Error in authenticated checkout:', error)
          showError(error.message || 'Error al procesar el pedido')
          return false
        }
      } else {
        // checkout como invitado - usamos el endpoint público
        if (!state.customer) {
          showError('Información del cliente requerida')
          return false
        }

        if (!addressToUse) {
          showError('Dirección de envío requerida')
          return false
        }

        if (!state.paymentMethod) {
          showError('Método de pago requerido')
          return false
        }

        const orderData = {
          customer: state.customer,
          items: state.items.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
          shippingAddress: addressToUse,
          paymentMethod: state.paymentMethod,
          notes: null,
          discount_id: state.appliedDiscount?.discount_id || null
        }

        const API_BASE = import.meta.env.VITE_API_BASE || '/api'
        const resp = await fetch(`${API_BASE}/public/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })

        const json = await resp.json()
        if (!resp.ok) {
          const msg = json?.message || 'Error al crear el pedido'
          showError(msg)
          return false
        }

        dispatch({ type: 'SET_APPLIED_DISCOUNT', payload: null })

        return {
          order: json?.data?.order,
          clientSecret: json?.data?.clientSecret,
          paymentIntentId: json?.data?.paymentIntentId
        }
      }

    } catch (error) {
      console.error('Error processing order:', error)
      showError('Error al procesar el pedido')
      return false
    }
  }

  const value = {
    // Estado
    items: state.items,
    total: state.total,
    itemCount: state.itemCount,
    isOpen: state.isOpen,
    customer: state.customer,
    shippingAddress: state.shippingAddress,
    paymentMethod: state.paymentMethod,
    appliedDiscount: state.appliedDiscount,

    // Acciones
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    setCartOpen,
    setCustomer,
    setShippingAddress,
    setPaymentMethod,
    setAppliedDiscount,
    processOrder,

    // Utilidades
    getItemQuantity: (productId) => {
      const item = state.items.find(item => item.id === productId)
      return item ? item.quantity : 0
    },

    isInCart: (productId) => {
      return state.items.some(item => item.id === productId)
    }
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export default CartContext