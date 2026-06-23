import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function TenantSelector({ onSelect }) {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logout } = useAuth()

  const handleSelect = (tenant) => {
    onSelect({
      role: tenant.role,
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
    })
  }

  const handleLogout = () => logout()

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data } = await axios.get('/api/auth/my-tenants')

        if (data.isSuperAdmin) {
          onSelect({ role: 'superadmin', tenantId: null })
          return
        }

        const list = data.tenants || []
        setTenants(list)
      } catch {
        setError('No se pudieron cargar tus tiendas.')
      } finally {
        setLoading(false)
      }
    }
    fetchTenants()
  }, [])

  if (loading) {
    return (
      <div style={styles.root}>
        <img src="./neonhub.png" alt="NeonHub" style={styles.logo} />
        <p style={styles.muted}>Cargando tus espacios…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.root}>
        <img src="./neonhub.png" alt="NeonHub" style={styles.logo} />
        <p style={{ ...styles.muted, color: '#ef4444' }}>{error}</p>
        <button style={styles.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
      </div>
    )
  }

  // estado vacío — no hay tiendas con rol de gestión
  if (tenants.length === 0) {
    return (
      <div style={styles.root}>
        <img src="./neonhub.png" alt="NeonHub" style={styles.logo} />
        <h1 style={styles.title}>NeonHub</h1>
        <p style={styles.subtitle}>No tienes ninguna tienda activa</p>
        <p style={styles.hint}>
          Crea tu tienda en neonhub.es para acceder al panel de gestión.
        </p>
        <button
          style={styles.primaryBtn}
          onClick={() => {
            if (window.electron?.openExternal) window.electron.openExternal('https://neonhub.es/register')
            else window.open('https://neonhub.es/register', '_blank')
          }}
        >
          Ir a neonhub.es →
        </button>
        <button style={styles.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
      </div>
    )
  }

  // selector de tienda cuando hay más de una
  return (
    <div style={styles.root}>
      <img src="./neonhub.png" alt="NeonHub" style={styles.logo} />
      <h1 style={styles.title}>Selecciona tu tienda</h1>
      <p style={styles.subtitle}>Elige la tienda que quieres gestionar</p>

      <div style={{ width: '100%', maxWidth: '480px' }}>
        {tenants.map(tenant => (
          <TenantCard key={tenant.id} tenant={tenant} onSelect={handleSelect} />
        ))}
      </div>

      <button style={styles.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

function TenantCard({ tenant, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const accent = tenant.primary_color || '#6366f1'

  return (
    <div
      onClick={() => onSelect(tenant)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1e293b',
        border: `1px solid ${hovered ? accent : '#334155'}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'border-color 0.2s',
        boxShadow: hovered ? `0 0 0 1px ${accent}33` : 'none',
      }}
    >
      {tenant.logo ? (
        <img
          src={tenant.logo}
          alt={tenant.name}
          style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: '48px', height: '48px', borderRadius: '10px',
          background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {tenant.name?.charAt(0).toUpperCase()}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 4px', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tenant.name}
        </p>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          {tenant.subdomain}.neonhub.es
        </p>
      </div>

      <span style={{
        background: 'rgba(99,102,241,0.15)', color: '#818cf8',
        padding: '4px 10px', borderRadius: '6px',
        fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
        flexShrink: 0,
      }}>
        {tenant.role}
      </span>

      <span style={{ color: '#475569', fontSize: '18px', flexShrink: 0 }}>→</span>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  logo: {
    width: '64px', height: '64px', borderRadius: '16px',
    marginBottom: '16px',
    boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
  },
  title: { color: '#f1f5f9', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' },
  subtitle: { color: '#94a3b8', fontSize: '14px', margin: '0 0 32px', textAlign: 'center' },
  hint: { color: '#64748b', fontSize: '14px', margin: '0 0 24px', textAlign: 'center', maxWidth: '320px', lineHeight: '1.5' },
  muted: { color: '#94a3b8', fontSize: '14px', margin: '0 0 16px' },
  primaryBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', borderRadius: '10px',
    padding: '12px 28px', color: '#fff',
    fontWeight: 700, fontSize: '15px',
    cursor: 'pointer', marginBottom: '12px',
  },
  logoutBtn: {
    marginTop: '12px', background: 'none',
    border: '1px solid #334155', borderRadius: '8px',
    padding: '8px 20px', color: '#64748b',
    cursor: 'pointer', fontSize: '13px',
  },
}
