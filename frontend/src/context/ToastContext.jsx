import React, { createContext, useContext } from 'react'
import useToastHook from '../hooks/useToast'
import ToastContainer from '../components/ui/ToastContainer'

const ToastContext = createContext()

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

// Export simplificado para facilitar el uso
export const useToast = () => {
  return useToastContext()
}

export const ToastProvider = ({ children }) => {
  const toastMethods = useToastHook()

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer toasts={toastMethods.toasts} onRemoveToast={toastMethods.removeToast} />
    </ToastContext.Provider>
  )
}