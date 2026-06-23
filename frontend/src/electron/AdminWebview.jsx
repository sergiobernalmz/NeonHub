import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminWebview() {
  const webviewRef = useRef(null)
  const { logout } = useAuth()

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const handleNavigate = (e) => {
      const url = e.url || e.target?.src || ''
      if (!url.includes('neonhub.es/admin') &&
          !url.includes('neonhub.es/auth') &&
          url !== 'about:blank') {
        e.preventDefault?.()
        wv.stop()
        wv.loadURL('https://neonhub.es/admin')
      }
    }

    const handleDomReady = () => {
      wv.insertCSS(`
        nav, header, .navbar, [class*="nav"], [class*="header"] {
          display: none !important;
        }
        footer, [class*="footer"] {
          display: none !important;
        }
        main, [class*="main"], body > div:first-child {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `)
    }

    wv.addEventListener('will-navigate', handleNavigate)
    wv.addEventListener('did-navigate', handleNavigate)
    wv.addEventListener('dom-ready', handleDomReady)

    return () => {
      wv.removeEventListener('will-navigate', handleNavigate)
      wv.removeEventListener('did-navigate', handleNavigate)
      wv.removeEventListener('dom-ready', handleDomReady)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <webview
        ref={webviewRef}
        src="https://neonhub.es/admin"
        style={{ width: '100%', height: '100%' }}
        allowpopups="true"
      />
      <button onClick={logout} style={styles.logoutBtn}>
        Cerrar sesión
      </button>
    </div>
  )
}

const styles = {
  logoutBtn: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    background: '#7f1d1d',
    color: '#fca5a5',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
}
