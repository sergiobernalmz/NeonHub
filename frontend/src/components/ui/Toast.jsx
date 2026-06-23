import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react'
import { useEffect } from 'react'

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
      default:
        return <CheckCircle className="w-5 h-5" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-400/10',
          border: 'border-green-400/30',
          text: 'text-green-400',
          icon: 'text-green-400'
        }
      case 'error':
        return {
          bg: 'bg-red-400/10',
          border: 'border-red-400/30',
          text: 'text-red-400',
          icon: 'text-red-400'
        }
      case 'info':
        return {
          bg: 'bg-blue-400/10',
          border: 'border-blue-400/30',
          text: 'text-blue-400',
          icon: 'text-blue-400'
        }
      default:
        return {
          bg: 'bg-green-400/10',
          border: 'border-green-400/30',
          text: 'text-green-400',
          icon: 'text-green-400'
        }
    }
  }

  const colors = getColors()

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
          className="w-full max-w-sm"
        >
          <div className={`${colors.bg} ${colors.border} backdrop-blur-sm border rounded-xl p-4 shadow-2xl`}>
            <div className="flex items-center space-x-3">
              <div className={colors.icon}>
                {getIcon()}
              </div>
              <div className="flex-1">
                <p className={`${colors.text} font-medium text-sm`}>
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Toast