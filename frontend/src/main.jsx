import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StripeProvider from './components/StripeProvider'
import axios from 'axios'

const mountApp = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <StripeProvider>
        <App />
      </StripeProvider>
    </StrictMode>
  )
}

if (window.electron?.isElectron) {
  // Construimos la URL del backend usando el subdominio de la tienda seleccionada.
  // Si no hay subdominio todavía (pantalla de login), usamos el fallback.
  const getBackendUrl = () => {
    const subdomain = sessionStorage.getItem('electron_subdomain')
    if (subdomain) return `https://${subdomain}.neonhub.es`
    return window.electron.backendUrl || 'https://tiendatfg.neonhub.es'
  }

  // configuramos axios con la URL del backend
  axios.defaults.baseURL = getBackendUrl()
  axios.interceptors.request.use((config) => {
    // recalculamos la baseURL en cada request por si el usuario cambió de tienda
    config.baseURL = getBackendUrl()
    const tenantId = sessionStorage.getItem('electron_tenant_id')
    if (tenantId) config.headers['x-tenant-id'] = tenantId
    return config
  })

  // parcheamos el fetch nativo — si no, los servicios que usan fetch('/api/...') irían a file://
  const _fetch = window.fetch.bind(window)
  window.fetch = (url, options = {}) => {
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = getBackendUrl() + url
      const tenantId = sessionStorage.getItem('electron_tenant_id')
      if (tenantId) {
        options = { ...options, headers: { 'x-tenant-id': tenantId, ...(options.headers || {}) } }
      }
    }
    return _fetch(url, options)
  }

  mountApp()
} else {
  // Web: usar origen actual (Vite proxy en dev, nginx en prod)
  axios.defaults.baseURL = ''
  mountApp()
}

// suprimimos el warning de React DevTools en desarrollo
if (import.meta.env.DEV) {
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('React DevTools')) return
    originalWarn.apply(console, args)
  }
}
