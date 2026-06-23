import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

export default function SupportTicketList({ email, apiBaseUrl }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replying, setReplying] = useState(false);

    const chatContainerRef = useRef(null);
    const selectedTicketRef = useRef(null);
    const prevTicketIdRef = useRef(null);
    const socketRef = useRef(null);

    // mantenemos el ref sincronizado para evitar closures desactualizados en los handlers del socket
    useEffect(() => { selectedTicketRef.current = selectedTicket; }, [selectedTicket]);

    // Auto-scroll — rAF garantiza que el DOM ya tiene el nuevo mensaje
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [selectedTicket?.id, selectedTicket?.responses?.length]);

    // Socket.IO — tiempo real para respuestas del soporte
    useEffect(() => {
        const socket = io(window.location.origin, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => console.log('🔌 [CEO] Socket conectado:', socket.id));
        socket.on('connect_error', (err) => console.error('❌ [CEO] Socket error:', err.message));

        socket.on('ticket:new-reply', ({ ticketId, ticket }) => {
            if (selectedTicketRef.current?.id === ticketId) {
                setSelectedTicket(ticket);
            }
            setTickets(prev => prev.map(t =>
                t.id === ticketId ? { ...t, updated_at: new Date().toISOString() } : t
            ));
        });

        socket.on('ticket:status-changed', ({ ticketId, status }) => {
            if (selectedTicketRef.current?.id === ticketId) {
                setSelectedTicket(prev => prev ? { ...prev, status } : prev);
            }
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
        });

        return () => {
            socket.off('ticket:new-reply');
            socket.off('ticket:status-changed');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [apiBaseUrl]);

    // entramos o salimos de la sala del ticket según el que esté seleccionado
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        const prevId = prevTicketIdRef.current;
        const newId = selectedTicket?.id;

        if (prevId && prevId !== newId) {
            socket.emit('ticket:leave', { ticketId: prevId, role: 'customer' });
        }
        if (newId) {
            socket.emit('ticket:join', { ticketId: newId, role: 'customer' });
        }
        prevTicketIdRef.current = newId;
    }, [selectedTicket?.id]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/portal/customer/tickets');
            const data = await res.json();
            if (data.success) {
                setTickets(data.data || []);
            } else {
                setError('Error al cargar los tickets');
            }
        } catch (err) {
            setError('No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newSubject.trim() || !newMessage.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch('/portal/customer/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: newSubject,
                    message: newMessage
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowNewTicketModal(false);
                setNewSubject('');
                setNewMessage('');
                fetchTickets(); // recargamos la lista
            } else {
                alert(data.message || 'Error al crear el ticket');
            }
        } catch (error) {
            alert('Error de red al crear el ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        setReplying(true);
        try {
            const res = await fetch(`/portal/customer/tickets/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: replyMessage
                })
            });
            const data = await res.json();
            if (data.success) {
                setReplyMessage('');
                setSelectedTicket(data.data);
                setTickets(prev => prev.map(t =>
                    t.id === data.data.id ? { ...t, updated_at: new Date().toISOString() } : t
                ));
            } else {
                alert(data.message || 'Error al enviar respuesta');
            }
        } catch (error) {
            alert('Error de red al enviar respuesta');
        } finally {
            setReplying(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">Abierto</span>;
            case 'in_progress':
                return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">En Progreso</span>;
            case 'resolved':
                return <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Resuelto</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 dark:bg-slate-500/10 text-gray-500 dark:text-slate-400 text-xs rounded-full border border-gray-200 dark:border-slate-500/20">{status}</span>;
        }
    };

    return (
        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 md:col-span-3 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Soporte Técnico
                </h2>
                <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Ticket
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                </div>
            ) : error ? (
                <div className="text-red-400 text-center py-4">{error}</div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                    <p className="text-gray-500 dark:text-slate-400">No tienes tickets de soporte activos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* lista de tickets */}
                    <div className="md:col-span-1 space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === ticket.id
                                    ? 'bg-violet-600/20 border-violet-500/50'
                                    : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{ticket.subject}</h3>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    {getStatusBadge(ticket.status)}
                                    <span className="text-xs text-gray-400 dark:text-slate-500">
                                        {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* detalle del ticket */}
                    <div className="md:col-span-2 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 flex flex-col h-[500px]">
                        {selectedTicket ? (
                            <>
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTicket.subject}</h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">ID: {selectedTicket.id}</p>
                                    </div>
                                    {getStatusBadge(selectedTicket.status)}
                                </div>

                                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                                    {/* Mensaje original */}
                                    <div className="flex flex-col items-end">
                                        <div className="bg-violet-600/20 border border-violet-500/30 rounded-2xl rounded-tr-sm p-4 max-w-[85%]">
                                            <p className="text-sm text-violet-600 dark:text-violet-200 mb-1 font-medium">Tú (Ticket Inicial)</p>
                                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedTicket.message}</p>
                                        </div>
                                    </div>

                                    {/* respuestas */}
                                    {selectedTicket.responses && selectedTicket.responses.length > 0 && selectedTicket.responses.map((reply, index) => (
                                        <div key={reply.id || index} className={`flex flex-col ${reply.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 max-w-[85%] rounded-2xl ${reply.sender === 'customer'
                                                ? 'bg-violet-600/20 border border-violet-500/30 rounded-tr-sm'
                                                : 'bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-tl-sm'
                                                }`}>
                                                <p className={`text-sm mb-1 font-medium ${reply.sender === 'customer' ? 'text-violet-600 dark:text-violet-200' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {reply.sender === 'customer' ? 'Tú' : 'Soporte Técnico'}
                                                </p>
                                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{reply.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* caja de respuesta */}
                                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl">
                                    {selectedTicket.status === 'resolved' ? (
                                        <p className="text-center text-gray-500 dark:text-slate-400 text-sm py-2">Este ticket ha sido marcado como resuelto. Puedes abrir uno nuevo si necesitas más ayuda.</p>
                                    ) : (
                                        <form onSubmit={handleReply} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                placeholder="Escribe tu respuesta..."
                                                className="flex-1 bg-white dark:bg-black/40 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
                                                disabled={replying}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!replyMessage.trim() || replying}
                                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
                                            >
                                                {replying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500">
                                Selecciona un ticket para ver los detalles
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* modal para crear un nuevo ticket */}
            {showNewTicketModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-xl dark:shadow-none">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Crear Nuevo Ticket</h3>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1">Asunto</label>
                                <input
                                    type="text"
                                    required
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                                    placeholder="Ej: Problema con módulo de inventario"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1">Mensaje</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                                    placeholder="Describe tu problema con el mayor detalle posible..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowNewTicketModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Crear Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
