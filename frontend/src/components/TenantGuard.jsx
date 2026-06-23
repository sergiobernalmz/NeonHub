import { useState, useEffect } from 'react'
import { ConfigProvider } from '../context/ConfigContext'
import { buildConfig } from '../pages/Shop'

const TENANT_BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN || 'neonhub.es'

function getHostInfo() {
  const host = window.location.hostname.toLowerCase()

  // Localhost or IP - treat as main store
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { type: 'local', subdomain: null, customDomain: null }
  }

  // Check if it's a custom domain (not ending with base domain)
  if (!host.endsWith(TENANT_BASE_DOMAIN)) {
    return { type: 'custom', subdomain: null, customDomain: host }
  }

  // Subdomain on base domain
  const withoutBase = host.slice(0, -(TENANT_BASE_DOMAIN.length)).replace(/\.$/, '')
  return { type: 'subdomain', subdomain: withoutBase || null, customDomain: null }
}

const TenantNotFound = ({ customDomain }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Tienda no encontrada</h1>
        <p className="text-gray-400 text-lg">
          {customDomain
            ? <>El dominio personalizado <span className="text-red-400 font-mono">{customDomain}</span> no corresponde a ninguna tienda registrada.</>
            : <>El subdominio <span className="text-red-400 font-mono">{window.location.hostname}</span> no corresponde a ninguna tienda registrada.</>
          }
        </p>
      </div>
      <a
        href={`https://${TENANT_BASE_DOMAIN}`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
      >
        Ir a {TENANT_BASE_DOMAIN}
      </a>
    </div>
  </div>
)

const TenantInactive = ({ reason }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-yellow-500/20 to-amber-500/20 flex items-center justify-center border border-yellow-500/30">
          <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Tienda no disponible</h1>
        <p className="text-gray-400 text-lg">
          {reason || 'Esta tienda se encuentra temporalmente desactivada.'}
        </p>
      </div>
      <a
        href={`https://${TENANT_BASE_DOMAIN}`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
      >
        Ir a {TENANT_BASE_DOMAIN}
      </a>
    </div>
  </div>
)

const TenantLoading = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-400">Cargando tienda...</p>
    </div>
  </div>
)

export default function TenantGuard({ children }) {
  const [status,         setStatus]         = useState('loading')
  const [inactiveReason, setInactiveReason] = useState('')
  const [tenantConfig,   setTenantConfig]   = useState(null)
  const [customDomain,   setCustomDomain]   = useState(null)

  useEffect(() => {
    const hostInfo = getHostInfo()
    if (hostInfo.type === 'custom') {
      setCustomDomain(hostInfo.customDomain)
    }

    // Localhost/IP or main domain without subdomain - use default tenant or skip
    if (hostInfo.type === 'local' || (hostInfo.type === 'subdomain' && !hostInfo.subdomain)) {
      // en Electron usamos el tenant_id del sessionStorage para pedir la config.
      // el parche de fetch en main.jsx ya inyecta x-tenant-id automáticamente.
      if (window.electron?.isElectron) {
        const tenantId = sessionStorage.getItem('electron_tenant_id')
        if (!tenantId) {
          setStatus('valid')
          return
        }
        // continuamos con el fetch de abajo — x-tenant-id lo inyecta main.jsx
      } else {
        setStatus('valid')
        return
      }
    }

    const controller = new AbortController()

    fetch('/api/public/tenant-check', {
      signal: controller.signal,
      credentials: 'include'
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status: httpStatus, data }) => {
        if (data.success && data.active) {
          window.__TENANT_CONFIG__ = data.tenant
          setTenantConfig(buildConfig(data.tenant))
          setStatus('valid')
        } else if (httpStatus === 403 && data.exists) {
          setInactiveReason(data.message || '')
          setStatus('inactive')
        } else {
          setStatus('not-found')
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Error al comprobar el tenant:', err)
          setStatus('not-found')
        }
      })

    return () => controller.abort()
  }, [])

  if (status === 'loading')   return <TenantLoading />
  if (status === 'not-found') return <TenantNotFound customDomain={customDomain} />
  if (status === 'inactive')  return <TenantInactive reason={inactiveReason} />

  const effectiveConfig = tenantConfig || buildConfig(window.__TENANT_CONFIG__ || {})
  return <ConfigProvider config={effectiveConfig}>{children}</ConfigProvider>
}
