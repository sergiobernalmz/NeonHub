import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const RoleProtectedRoute = ({ children, requiredRoles = [], requiredLevel = 0, fallbackPath = '/dashboard' }) => {
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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // comprobamos si el usuario tiene los roles necesarios
  const hasRequiredRole = requiredRoles.length === 0 ||
    user.roles?.some(role => requiredRoles.includes(role.name))

  // comprobamos si el usuario tiene el nivel requerido
  const hasRequiredLevel = requiredLevel === 0 ||
    user.roles?.some(role => role.level >= requiredLevel)

  if (!hasRequiredRole && !hasRequiredLevel) {
    // redirigimos al fallback (dashboard o página de acceso denegado)
    return <Navigate to={fallbackPath} replace />
  }

  return children
}

export default RoleProtectedRoute