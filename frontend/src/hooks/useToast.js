import { useState, useCallback } from 'react'

const useToast = () => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      message,
      type,
      duration,
      isVisible: true
    }

    setToasts(prev => [...prev, newToast])

    // quita el mensaje cuando pase el tiempo
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message, duration) => {
    return showToast(message, 'success', duration)
  }, [showToast])

  const showError = useCallback((message, duration) => {
    return showToast(message, 'error', duration)
  }, [showToast])

  const showInfo = useCallback((message, duration) => {
    return showToast(message, 'info', duration)
  }, [showToast])

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast
  }
}

export default useToast