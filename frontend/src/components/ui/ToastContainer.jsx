import Toast from './Toast'

const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={() => onRemoveToast(toast.id)}
            duration={0} // la duración la gestiona el hook
          />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer