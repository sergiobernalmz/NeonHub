import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Search, Send, ChevronDown, Inbox } from 'lucide-react'
import { useToastContext } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { connectSocket } from '../services/socketService'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
})

const STATUS_CONFIG = {
  open:        { labelKey: 'statusOpen',       color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  in_progress: { labelKey: 'statusInProgress', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  resolved:    { labelKey: 'statusResolved',   color: 'bg-green-400/10 text-green-400 border-green-400/20' },
}

const PRIORITY_CONFIG = {
  low:    { labelKey: 'priorityLow',    color: 'bg-gray-400/10 text-gray-400' },
  normal: { labelKey: 'priorityNormal', color: 'bg-blue-400/10 text-blue-400' },
  high:   { labelKey: 'priorityHigh',   color: 'bg-orange-400/10 text-orange-400' },
  urgent: { labelKey: 'priorityUrgent', color: 'bg-red-400/10 text-red-400' },
}

const StatusBadge = ({ status, t }) => {
  const cfg = STATUS_CONFIG[status] || { labelKey: null, color: 'bg-gray-400/10 text-gray-400 border-gray-400/20' }
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${cfg.color}`}>{cfg.labelKey ? t(cfg.labelKey) : status}</span>
}

const PriorityBadge = ({ priority, t }) => {
  const cfg = PRIORITY_CONFIG[priority] || { labelKey: null, color: 'bg-gray-400/10 text-gray-400' }
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.color}`}>{cfg.labelKey ? t(cfg.labelKey) : priority}</span>
}

const Tickets = () => {
  const { showSuccess, showError } = useToastContext()
  const { t } = useLanguage()
  const { user } = useAuth()

  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  const chatContainerRef = useRef(null)
  const selectedTicketRef = useRef(null)
  const prevTicketIdRef = useRef(null)

  useEffect(() => { selectedTicketRef.current = selectedTicket }, [selectedTicket])

  // auto-scroll cuando llega un mensaje nuevo
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedTicket?.id, selectedTicket?.responses?.length])

  // socket — eventos de tickets en tiempo real
  useEffect(() => {
    const storeId = user?.store_id || user?.storeId
    if (!storeId) return

    const socket = connectSocket()

    socket.on('ticket:new', ({ ticket }) => {
      if (ticket.store_id !== storeId) return
      setTickets(prev => [ticket, ...prev])
      setStats(prev => prev ? { ...prev, total: (prev.total || 0) + 1, open: (prev.open || 0) + 1 } : prev)
    })

    socket.on('ticket:new-reply', ({ ticketId, ticket }) => {
      if (selectedTicketRef.current?.id === ticketId) {
        setSelectedTicket(ticket)
      }
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, read_by_admin: false, updated_at: new Date().toISOString() } : t
      ))
    })

    socket.on('ticket:status-changed', ({ ticketId, status }) => {
      if (selectedTicketRef.current?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status } : prev)
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
    })

    return () => {
      socket.off('ticket:new')
      socket.off('ticket:new-reply')
      socket.off('ticket:status-changed')
    }
  }, [user])

  // unirse/salir de sala al cambiar ticket seleccionado
  useEffect(() => {
    const socket = connectSocket()
    const prevId = prevTicketIdRef.current
    const newId = selectedTicket?.id

    if (prevId && prevId !== newId) {
      socket.emit('ticket:leave', { ticketId: prevId, role: 'admin' })
    }
    if (newId) {
      socket.emit('ticket:join', { ticketId: newId, role: 'admin' })
    }
    prevTicketIdRef.current = newId
  }, [selectedTicket?.id])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets/store/stats', { headers: authHeaders() })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch {}
  }, [])

  // silent=true omite el spinner (refresco en segundo plano)
  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') params.set('status', activeFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/tickets/store?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) setTickets(data.data)
    } catch {
      showError('Error al cargar los tickets')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/store/${selectedTicket.id}/reply`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ message: replyText })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setSelectedTicket(data.data)
      setReplyText('')
      setTickets(prev => prev.map(t =>
        t.id === data.data.id ? { ...t, updated_at: new Date().toISOString() } : t
      ))
      fetchStats()
      showSuccess('Respuesta enviada')
    } catch (err) {
      showError(err.message || 'Error al enviar respuesta')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || statusChanging) return
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/tickets/store/${selectedTicket.id}/status`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setSelectedTicket(data.data)
      setTickets(prev => prev.map(t =>
        t.id === data.data.id ? { ...t, status: data.data.status } : t
      ))
      fetchStats()
      showSuccess('Estado actualizado')
    } catch (err) {
      showError(err.message || 'Error al cambiar estado')
    } finally {
      setStatusChanging(false)
    }
  }

  const FILTERS = [
    { key: 'all',         label: t('all'),             count: stats?.total },
    { key: 'open',        label: t('statusOpen'),       count: stats?.open },
    { key: 'in_progress', label: t('statusInProgress'), count: stats?.in_progress },
    { key: 'resolved',    label: t('statusResolved'),   count: stats?.resolved },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-400" />
          {t('ticketsTitle')}
        </h1>
        <p className="text-gray-400">{t('ticketsDescription')}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('total'),           value: stats.total,       color: 'text-white' },
            { label: t('statusOpen'),      value: stats.open,        color: 'text-yellow-400' },
            { label: t('statusInProgress'),value: stats.in_progress, color: 'text-blue-400' },
            { label: t('statusResolved'),  value: stats.resolved,    color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gray-800/50 border border-gray-700/50 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-700/50 overflow-x-auto">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex-shrink-0 px-3 py-3 text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'text-white border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {f.label}{f.count != null ? ` (${f.count})` : ''}
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-gray-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchTickets')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-blue-400/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Inbox className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">{t('noTickets')}</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 border-b border-gray-700/30 transition-colors ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-blue-500/10 border-l-2 border-l-blue-400'
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-white line-clamp-1 flex-1">{ticket.subject}</p>
                    {!ticket.read_by_admin && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2 truncate">{ticket.customer_email}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ticket.status} t={t} />
                    <PriorityBadge priority={ticket.priority} t={t} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-2xl flex flex-col overflow-hidden" style={{ minHeight: '520px' }}>
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Selecciona un ticket para ver los detalles</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white mb-1 truncate">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-400">{selectedTicket.customer_email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={selectedTicket.status} t={t} />
                    <PriorityBadge priority={selectedTicket.priority} t={t} />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <label className="text-xs text-gray-400">Estado:</label>
                  <div className="relative">
                    <select
                      value={selectedTicket.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      disabled={statusChanging}
                      className="appearance-none pl-3 pr-7 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="open">{t('statusOpen')}</option>
                      <option value="in_progress">{t('statusInProgress')}</option>
                      <option value="resolved">{t('statusResolved')}</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3" style={{ maxHeight: '340px' }}>
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-gray-700/50 border border-gray-600/50 rounded-2xl rounded-tl-sm p-3">
                    <p className="text-xs text-blue-400 font-medium mb-1">Cliente · mensaje inicial</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                {(selectedTicket.responses || []).map((reply, i) => (
                  <div key={reply.id || i} className={`flex ${reply.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 ${
                      reply.sender === 'admin'
                        ? 'bg-blue-500/20 border border-blue-500/30 rounded-tr-sm'
                        : 'bg-gray-700/50 border border-gray-600/50 rounded-tl-sm'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${reply.sender === 'admin' ? 'text-blue-400' : 'text-gray-400'}`}>
                        {reply.sender === 'admin' ? (reply.admin_name || 'Soporte') : 'Cliente'}
                      </p>
                      <p className="text-sm text-white whitespace-pre-wrap">{reply.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(reply.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

              </div>

              <div className="p-4 border-t border-gray-700/50 bg-gray-900/30">
                {selectedTicket.status === 'resolved' ? (
                  <p className="text-center text-sm text-gray-500 py-2">Ticket resuelto. Cambia el estado para seguir respondiendo.</p>
                ) : (
                  <form onSubmit={handleReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={t('writeReply')}
                      className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-400/50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sending}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default Tickets
