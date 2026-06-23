import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import CSSVariables from '../components/shop/CSSVariables'

const ShopSupport = () => {
  const config   = useConfig()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: user?.email || '',
    subject: '',
    message: '',
    priority: 'normal',
  })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const storeName = config?.name || 'Tienda'
  const primary   = config?.colors?.primary || '#2563eb'
  const bg        = config?.colors?.background || '#ffffff'
  const isDark    = bg !== '#ffffff'

  const cardStyle  = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const labelColor = isDark ? '#94a3b8' : '#374151'
  const inputStyle = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }
  const mutedColor = isDark ? '#64748b' : '#6b7280'

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.subject || !form.message) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: form.email,
          subject: form.subject,
          message: form.message,
          priority: form.priority,
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Error al enviar')
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Error al enviar el ticket. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4">
        <CSSVariables config={config} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl p-10 border text-center backdrop-blur-sm shadow-xl"
          style={cardStyle}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${primary}20` }}>
            <CheckCircle className="w-8 h-8" style={{ color: primary }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: primary }}>¡Ticket enviado!</h2>
          <p className="text-sm mb-1" style={{ color: mutedColor }}>
            Tu ticket ha sido enviado. Te responderemos en breve a
          </p>
          <p className="text-sm font-semibold mb-6" style={{ color: isDark ? '#f1f5f9' : '#111827' }}>{form.email}</p>
          <div className="flex flex-col gap-3">
            {user && (
              <button
                onClick={() => navigate('/shop/tickets')}
                className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Ver mis tickets
              </button>
            )}
            <button
              onClick={() => navigate('/shop')}
              className="w-full py-3 font-semibold rounded-lg text-sm transition-opacity hover:opacity-80 border"
              style={{ color: primary, borderColor: primary, background: 'transparent' }}
            >
              Volver a la tienda
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4">
      <CSSVariables config={config} />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          {config?.logo ? (
            <img src={config.logo} alt={storeName} className="h-12 mx-auto mb-4 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg" style={{ backgroundColor: primary }}>
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: primary }}>{storeName}</h1>
          <p className="mt-1 text-sm" style={{ color: mutedColor }}>Soporte técnico</p>
        </div>

        <div className="rounded-2xl p-8 border backdrop-blur-sm shadow-xl" style={cardStyle}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>
                Email *
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                readOnly={!!user}
                style={{ ...inputStyle, opacity: user ? 0.7 : 1 }}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                placeholder="tu@email.com"
              />
              {user && <p className="mt-1 text-xs" style={{ color: mutedColor }}>Usando el email de tu cuenta</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>Asunto *</label>
              <input
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                style={inputStyle}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                placeholder="Ej: Problema con mi pedido #1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>Prioridad</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                style={inputStyle}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: labelColor }}>Mensaje *</label>
              <textarea
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                style={inputStyle}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none resize-none"
                placeholder="Describe tu consulta o problema con el mayor detalle posible..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: primary }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Enviar ticket</>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: mutedColor }}>
            <Link to="/shop" className="font-semibold hover:opacity-80" style={{ color: primary }}>
              ← Volver a la tienda
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default ShopSupport
