import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return null

  const isAdmin = user?.roles?.some(role =>
    ['ceo', 'admin', 'superadmin'].includes(role.name) || role.level >= 40
  )

  // los clientes y usuarios sin sesión vuelven a la tienda
  if (!isAdmin) {
    return <Navigate to="/shop" replace />
  }

  return children
}

export default AdminRoute
