import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to={window.electron?.isElectron ? '/electron-login' : '/login'}
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
