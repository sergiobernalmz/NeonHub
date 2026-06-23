import { useConfig } from '../context/ConfigContext'
import { useAuth } from '../context/AuthContext'
import AccessDenied from './AccessDenied'

const FeatureRoute = ({ featureKey, minLevel, children }) => {
  const config = useConfig()
  const { user } = useAuth()

  const storeFeatures = config?.features || {}
  const userPermissions = user?.userPermissions || {}
  const userLevel = user?.roles?.reduce((max, r) => Math.max(max, r.level || 0), 0) ?? 0

  if (featureKey && storeFeatures[featureKey] === false) {
    return <AccessDenied reason="feature" />
  }

  if (minLevel && userLevel < minLevel) {
    return <AccessDenied reason="level" />
  }

  if (featureKey && userPermissions[featureKey] === false) {
    return <AccessDenied reason="permission" />
  }

  return children
}

export default FeatureRoute
