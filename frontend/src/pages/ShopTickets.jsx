import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, ArrowLeft, Send, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { isDarkColor } from '../utils/colorUtils'
import CSSVariables from '../components/shop/CSSVariables'
import { connectSocket } from '../services/socketService'

const STATUS = {
  open:        { label: 'Abierto',     bg: 'rgba(234,179,8,0.15)',   color: '#ca8a04',  border: 'rgba(234,179,8,0.3)'   },
  in_progress: { label: 'En progreso', bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6',  border: 'rgba(59,130,246,0.3)'  },
  resolved:    { label: 'Resuelto',    bg: 'rgba(34,197,94,0.15)',   color: '#16a34a',  border: 'rgba(34,197,94,0.3)'   },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, bg: 'rgba(100,116,139,0.15)', color: '#64748b', border: 'rgba(100,116,139,0.3)' }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ShopTickets() {
  const config   = useConfig()
  const { user } = useAuth()
  const navigate = useNavigate()

  const primary   = config?.colors?.primary || '#2563eb'
  const bg        = config?.colors?.background || '#ffffff'
  const isDark    = bg !== '#ffffff'
  const textColor = isDark ? '#f1f5f9' : '#111827'
  const mutedColor = isDark ? '#94a3b8' : '#6b7280'
  const cardStyle  = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.08)' }
  const inputStyle = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#111827' }

  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const chatRef       = useRef(null)
  const selectedRef   = useRef(null)
  const prevTicketRef = useRef(null)

  useEffect(() => { selectedRef.current = selected }, [selected])

  // auto-scroll con rAF para esperar a que el DOM pinte el mensaje
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [selected?.id, selected?.responses?.length])

  // socket — respuestas del admin en tiempo real
  useEffect(() => {
    const socket = connectSocket()

    socket.on('ticket:new-reply', ({ ticketId, ticket }) => {
      if (selectedRef.current?.id === ticketId) {
        setSelected(ticket)
      }
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, read_by_customer: false, updated_at: new Date().toISOString() } : t
      ))
    })

    socket.on('ticket:status-changed', ({ ticketId, status }) => {
      if (selectedRef.current?.id === ticketId) {
        setSelected(prev => prev ? { ...prev, status } : prev)
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
    })

    return () => {
      socket.off('ticket:new-reply')
      socket.off('ticket:status-changed')
    }
  }, [])

  // unirse/salir de la sala del ticket al cambiar selección
  useEffect(() => {
    const socket = connectSocket()
    const prevId = prevTicketRef.current
    const newId  = selected?.id

    if (prevId && prevId !== newId) {
      socket.emit('ticket:leave', { ticketId: prevId, role: 'customer' })
    }
    if (newId) {
      socket.emit('ticket:join', { ticketId: newId, role: 'customer' })
    }
    prevTicketRef.current = newId
  }, [selected?.id])

  useEffect(() => {
    if (!user?.email) { navigate('/login'); return }
    fetchTickets()
  }, [user])

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` })

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/tickets/customer', { headers: authHeaders() })
      const data = await res.json()
      if (data.success) setTickets(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const openTicket = async (ticket) => {
    setSelected(ticket)
    setReply('')
    if (!ticket.read_by_customer) {
      try {
        await fetch(`/api/tickets/${ticket.id}/read-customer`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ email: user.email })
        })
        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, read_by_customer: true } : t))
      } catch (_) {}
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      const res  = await fetch(`/api/tickets/${selected.id}/reply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: reply, email: user.email })
      })
      const data = await res.json()
      if (data.success) {
        setSelected(data.data)
        setReply('')
        setTickets(prev => prev.map(t => t.id === data.data.id ? { ...data.data, read_by_customer: true } : t))
      }
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  return (
    <div className="shop-root tenant-theme min-h-screen" style={{ background: bg }}>
      <CSSVariables config={config} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => selected ? setSelected(null) : navigate('/shop')}
            className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: primary }}>
            <ArrowLeft className="w-4 h-4" />
            {selected ? 'Mis tickets' : 'Tienda'}
          </button>
          <span style={{ color: mutedColor }}>›</span>
          <span className="text-sm font-semibold" style={{ color: textColor }}>
            {selected ? selected.subject : 'Mis tickets de soporte'}
          </span>
        </div>

        {!selected ? (
          /* lista de tickets */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: textColor }}>
                <MessageSquare className="w-5 h-5" style={{ color: primary }} />
                Mis tickets
              </h1>
              <button
                onClick={() => navigate('/shop/support')}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primary }}>
                + Nuevo ticket
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${primary}40`, borderTopColor: primary }} />
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border p-12 text-center backdrop-blur-sm" style={cardStyle}>
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: textColor }} />
                <p className="font-medium" style={{ color: textColor }}>No tienes tickets abiertos</p>
                <p className="text-sm mt-1" style={{ color: mutedColor }}>¿Tienes algún problema? Abre un ticket y te ayudamos.</p>
                <button
                  onClick={() => navigate('/shop/support')}
                  className="mt-5 text-sm font-semibold px-5 py-2 rounded-lg text-white"
                  style={{ backgroundColor: primary }}>
                  Crear ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <motion.button
                    key={ticket.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => openTicket(ticket)}
                    className="w-full text-left rounded-2xl border p-5 backdrop-blur-sm flex items-center gap-4 transition-shadow hover:shadow-lg"
                    style={cardStyle}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold truncate" style={{ color: textColor }}>{ticket.subject}</span>
                        {!ticket.read_by_customer && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: primary }} title="Nueva respuesta" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <StatusBadge status={ticket.status} />
                        <span className="text-xs flex items-center gap-1" style={{ color: mutedColor }}>
                          <Clock className="w-3 h-3" />
                          {formatDate(ticket.created_at || ticket.createdAt)}
                        </span>
                        {!ticket.read_by_customer && (
                          <span className="text-xs font-semibold" style={{ color: primary }}>Nueva respuesta</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: mutedColor }} />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* detalle del ticket */
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
            <div className="rounded-2xl border p-5 mb-4 backdrop-blur-sm" style={cardStyle}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: textColor }}>{selected.subject}</h2>
                  <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                    Abierto el {formatDate(selected.created_at || selected.createdAt)}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div
              ref={chatRef}
              className="rounded-2xl border backdrop-blur-sm p-5 flex flex-col gap-4 overflow-y-auto mb-4"
              style={{ ...cardStyle, maxHeight: '420px' }}
            >
              <div className="flex flex-col items-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm p-4"
                  style={{ background: `${primary}20`, border: `1px solid ${primary}40` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: primary }}>Tú · ticket inicial</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: textColor }}>{selected.message}</p>
                  <p className="text-xs mt-2 text-right" style={{ color: mutedColor }}>{formatDate(selected.created_at || selected.createdAt)}</p>
                </div>
              </div>

              {(selected.responses || []).map((r, i) => {
                const isCustomer = r.sender === 'customer'
                return (
                  <div key={r.id || i} className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${isCustomer ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={isCustomer
                        ? { background: `${primary}20`, border: `1px solid ${primary}40` }
                        : isDark
                          ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }
                          : { background: '#f1f5f9', border: '1px solid #e2e8f0' }
                      }>
                      <p className="text-xs font-semibold mb-1" style={{ color: isCustomer ? primary : (isDark ? '#fbbf24' : '#92400e') }}>
                        {isCustomer ? 'Tú' : (r.admin_name || 'Soporte técnico')}
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: textColor }}>{r.message}</p>
                      <p className="text-xs mt-2" style={{ color: mutedColor, textAlign: isCustomer ? 'right' : 'left' }}>
                        {formatDate(r.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {selected.status === 'resolved' ? (
              <div className="rounded-2xl border p-4 text-center text-sm backdrop-blur-sm" style={cardStyle}>
                <span style={{ color: mutedColor }}>Este ticket está resuelto. </span>
                <button onClick={() => navigate('/shop/support')}
                  className="font-semibold hover:opacity-75 transition-opacity" style={{ color: primary }}>
                  ¿Necesitas más ayuda? Abre un nuevo ticket →
                </button>
              </div>
            ) : (
              <form onSubmit={handleReply} className="rounded-2xl border p-4 backdrop-blur-sm flex gap-3" style={cardStyle}>
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={inputStyle}
                />
                <button
                  type="submit"
                  disabled={!reply.trim() || sending}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primary, color: isDarkColor(primary) ? '#fff' : '#000' }}
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" /> Enviar</>
                  }
                </button>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
