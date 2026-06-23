import { useAuth } from '../context/AuthContext'
import TenantSelector from './TenantSelector'
import AdminWebview from './AdminWebview'

export default function ElectronTenantGate({ children }) {
  const { needsTenantSelection, selectElectronTenant, electronTenant } = useAuth()

  if (needsTenantSelection) {
    return (
      <TenantSelector
        onSelect={(selection) => {
          selectElectronTenant(selection)
        }}
      />
    )
  }

  if (electronTenant?.role === 'superadmin') return <AdminWebview />

  return children
}
