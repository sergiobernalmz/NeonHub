import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, Clock, Search, ExternalLink, Mail, Calendar, Server, Power, PowerOff, Users, Package, ShoppingCart, Eye, XCircle, MessageSquare, Pause, Play, Trash2, DollarSign, AlertTriangle, Palette, Globe, Link } from 'lucide-react';
import tenantService from '../services/tenantService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import StoreBrandingModal from '../components/StoreBrandingModal';
import EditTenantModal from '../components/EditTenantModal';

const SaaSAdminDashboard = () => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('stores');
    const [stores, setStores] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);
    const [approving, setApproving] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [requestsFilter, setRequestsFilter] = useState('all');

    // Ticket handling states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replying, setReplying] = useState(false);

    // Branding modal state
    const [brandingStore, setBrandingStore] = useState(null);

    // Domain/Routes modal state
    const [editingStore, setEditingStore] = useState(null);

    useEffect(() => {
        if (activeTab === 'stores') {
            fetchStores();
        } else if (activeTab === 'requests') {
            fetchRequests();
        } else if (activeTab === 'tickets') {
            fetchTickets();
        } else if (activeTab === 'payments') {
            fetchPayments();
        } else if (activeTab === 'domains') {
            // domains uses same data as stores, no extra fetch needed
        }
    }, [activeTab]);

    const fetchStores = async () => {
        try {
            setLoading(true);
            const data = await tenantService.getStores();
            setStores(data);
        } catch (error) {
            console.error('Error fetching stores:', error);
            showToast('Error al cargar las tiendas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await tenantService.getProvisioningRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            showToast('Error al cargar las solicitudes', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const data = await tenantService.getAllTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            showToast('Error al cargar los tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const data = await tenantService.getAllPayments();
            setPayments(data);
        } catch (error) {
            console.error('Error fetching payments:', error);
            showToast('Error al cargar los pagos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStore = async (id, currentStatus) => {
        const action = currentStatus ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Seguro que quieres ${action} esta empresa?`)) return;

        try {
            setToggling(id);
            const result = await tenantService.toggleStoreActive(id);
            showToast(result.message || `Empresa ${action}da correctamente`, 'success');
            fetchStores();
        } catch (error) {
            showToast('Error al cambiar el estado: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setToggling(null);
        }
    };

    const handlePauseStore = async (id, isPaused) => {
        const action = isPaused ? 'reactivar' : 'pausar';
        if (!window.confirm(`¿Seguro que quieres ${action} este servicio?`)) return;

        try {
            setToggling(id);
            const reason = !isPaused ? window.prompt('Razón de la pausa (opcional):') || '' : '';
            const result = await tenantService.pauseStore(id, reason);
            showToast(result.message || `Servicio ${action}do correctamente`, 'success');
            fetchStores();
        } catch (error) {
            showToast('Error: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setToggling(null);
        }
    };

    const handleDeleteStore = async (id, name) => {
        if (!window.confirm(`⚠️ ¿Seguro que quieres ELIMINAR la empresa "${name}"? Esta acción no se puede deshacer fácilmente.`)) return;
        if (!window.confirm(`Confirma de nuevo: ¿Eliminar "${name}" definitivamente?`)) return;

        try {
            setToggling(id);
            const result = await tenantService.deleteStore(id);
            showToast(result.message || 'Empresa eliminada', 'success');
            fetchStores();
        } catch (error) {
            showToast('Error: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setToggling(null);
        }
    };

    const handleUpdatePaymentStatus = async (id, name, currentStatus) => {
        const newStatus = window.prompt(
            `Estado de pago actual: ${currentStatus || 'sin definir'}\n\nEscribe el nuevo estado:\n• paid - Pagado\n• pending - Pendiente\n• overdue - Vencido\n• cancelled - Cancelado\n• trial - Prueba`
        );
        if (!newStatus) return;

        const validStatuses = ['paid', 'pending', 'overdue', 'cancelled', 'trial'];
        if (!validStatuses.includes(newStatus)) {
            showToast(`Estado inválido. Usa: ${validStatuses.join(', ')}`, 'error');
            return;
        }

        try {
            const result = await tenantService.updatePaymentStatus(id, newStatus);
            showToast(result.message || 'Estado de pago actualizado', 'success');
            fetchStores();
        } catch (error) {
            showToast('Error: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleUpdatePlan = async (id, name, currentPlan) => {
        const planNames = { starter: 'Esencial', installation: 'Profesional', enterprise: 'Premium' };
        const currentLabel = planNames[currentPlan] || currentPlan || 'sin definir';
        const newPlan = window.prompt(
            `Plan actual de "${name}": ${currentLabel}\n\nEscribe el nuevo plan:\n• starter - Esencial (499€)\n• installation - Profesional (999€)\n• enterprise - Premium (1499€)`
        );
        if (!newPlan) return;
        const validPlans = ['starter', 'installation', 'enterprise'];
        if (!validPlans.includes(newPlan)) {
            showToast(`Plan inválido. Usa: ${validPlans.join(', ')}`, 'error');
            return;
        }
        try {
            const result = await tenantService.updatePlan(id, newPlan);
            showToast(result.message || 'Plan actualizado', 'success');
            fetchStores();
        } catch (error) {
            showToast('Error: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('¿Seguro que quieres aprobar este tenant y crear su entorno?')) return;

        try {
            setApproving(id);
            await tenantService.approveProvisioningRequest(id);
            showToast('Provisioning iniciado correctamente', 'success');
            fetchRequests();
        } catch (error) {
            showToast('Error al aprobar: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setApproving(null);
        }
    };

    const handleReplyToTicket = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        setReplying(true);
        try {
            const result = await tenantService.replyToTicket(selectedTicket.id, replyMessage);
            setReplyMessage('');
            setSelectedTicket(result.data || result);
            fetchTickets();
            showToast('Respuesta enviada', 'success');
        } catch (_error) {
            showToast('Error al enviar la respuesta', 'error');
        } finally {
            setReplying(false);
        }
    };

    const handleUpdateTicketStatus = async (status) => {
        if (!selectedTicket) return;
        try {
            const result = await tenantService.updateTicketStatus(selectedTicket.id, status);
            setSelectedTicket(result.data || result);
            fetchTickets();
            showToast(`Estado actualizado a ${status}`, 'success');
        } catch (_error) {
            showToast('Error al actualizar el estado', 'error');
        }
    };

    // Filtered data
    const filteredStores = stores.filter(store => {
        const term = searchTerm.toLowerCase();
        return (
            store.name?.toLowerCase().includes(term) ||
            store.subdomain?.toLowerCase().includes(term)
        );
    });

    const filteredRequests = requests
        .filter(req => {
            const term = searchTerm.toLowerCase();
            return (
                req.payload?.tenant_name?.toLowerCase().includes(term) ||
                req.payload?.subdomain?.toLowerCase().includes(term) ||
                req.payload?.owner_email?.toLowerCase().includes(term) ||
                req.status?.toLowerCase().includes(term)
            );
        })
        .filter(req => {
            if (requestsFilter === 'pending') return ['queued', 'processing', 'pending'].includes(req.status);
            if (requestsFilter === 'completed') return req.status === 'completed';
            return true;
        });

    const filteredTickets = tickets.filter(t => {
        const term = searchTerm.toLowerCase();
        return (
            t.customer_email?.toLowerCase().includes(term) ||
            t.subject?.toLowerCase().includes(term) ||
            t.status?.toLowerCase().includes(term)
        );
    });

    // Stats
    const totalStores = stores.length;
    const activeStores = stores.filter(s => s.is_active).length;
    const inactiveStores = stores.filter(s => !s.is_active).length;
    const pendingRequests = requests.filter(r => ['queued', 'processing', 'pending'].includes(r.status)).length;
    const openTickets = tickets.filter(t => t.status !== 'resolved').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 flex items-center w-fit">
                        <CheckCircle className="w-3 h-3 mr-1" /> Completado
                    </span>
                );
            case 'queued':
            case 'processing':
            case 'pending':
                return (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20 flex items-center w-fit">
                        <Clock className="w-3 h-3 mr-1" /> Pendiente
                    </span>
                );
            case 'failed':
                return (
                    <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 flex items-center w-fit">
                        <XCircle className="w-3 h-3 mr-1" /> Fallido
                    </span>
                );
            case 'open':
                return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20 w-fit">Abierto</span>;
            case 'in_progress':
                return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20 w-fit">En Progreso</span>;
            case 'resolved':
                return <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20 w-fit">Resuelto</span>;
            default:
                return (
                    <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20 w-fit">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Panel de Control SaaS
                    </h1>
                    <p className="text-gray-400 mt-1">Gestiona todas las empresas y tenants de NeonHub.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-sm font-medium">Total Empresas</h3>
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalStores}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-sm font-medium">Activas</h3>
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                            <Power className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{activeStores}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-sm font-medium">Inactivas</h3>
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                            <PowerOff className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-red-400">{inactiveStores}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-5"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-sm font-medium">Solicitudes Pendientes</h3>
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{pendingRequests}</div>
                </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-700/50 pb-0">
                <button
                    onClick={() => { setActiveTab('stores'); setSearchTerm(''); }}
                    className={`px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${activeTab === 'stores'
                        ? 'text-white border-blue-500 bg-gray-800/50'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                        }`}
                >
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Empresas ({totalStores})
                </button>
                <button
                    onClick={() => { setActiveTab('requests'); setSearchTerm(''); setRequestsFilter('all'); }}
                    className={`px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${activeTab === 'requests'
                        ? 'text-white border-blue-500 bg-gray-800/50'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                        }`}
                >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Solicitudes
                    {pendingRequests > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            {pendingRequests}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('tickets'); setSearchTerm(''); }}
                    className={`px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${activeTab === 'tickets'
                        ? 'text-white border-blue-500 bg-gray-800/50'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                        }`}
                >
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Soporte
                    {openTickets > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            {openTickets}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('payments'); setSearchTerm(''); }}
                    className={`px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${activeTab === 'payments'
                        ? 'text-white border-blue-500 bg-gray-800/50'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                        }`}
                >
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Pagos y Cobros
                </button>
                <button
                    onClick={() => { setActiveTab('domains'); setSearchTerm(''); }}
                    className={`px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${activeTab === 'domains'
                        ? 'text-white border-blue-500 bg-gray-800/50'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                        }`}
                >
                    <Globe className="w-4 h-4 inline mr-2" />
                    Dominios y Rutas
                </button>
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden"
            >
                {/* Search */}
                <div className="p-5 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-white">
                        {activeTab === 'stores' ? 'Listado de Empresas' : activeTab === 'requests' ? 'Solicitudes de Provisioning' : activeTab === 'tickets' ? 'Tickets de Soporte' : activeTab === 'domains' ? 'Dominios y Rutas' : 'Historial de Pagos y Cobros'}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-72 transition-all placeholder:text-gray-500"
                        />
                    </div>
                </div>

                {/* Stores Tab */}
                {activeTab === 'stores' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700/50 bg-gray-900/30">
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Empresa / Dominio</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Usuarios</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Productos</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden lg:table-cell">Pedidos</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden lg:table-cell">Creada</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Plan</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Pago</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                                <p>Cargando empresas...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStores.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400">
                                            <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                            <p>No hay empresas registradas.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStores.map(store => (
                                        <tr key={store.id} className="hover:bg-gray-700/20 transition-colors group">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${store.is_active
                                                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
                                                        : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30'
                                                        }`}>
                                                        <Building2 className={`w-5 h-5 ${store.is_active ? 'text-green-400' : 'text-red-400'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">{store.name}</p>
                                                        <a
                                                            href={`https://${store.subdomain}.neonhub.es`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1 mt-0.5"
                                                        >
                                                            {store.subdomain}.neonhub.es <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                    <span>{store.dataValues?.userCount || store.userCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                                                    <Package className="w-4 h-4 text-gray-500" />
                                                    <span>{store.dataValues?.productCount || store.productCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 hidden lg:table-cell">
                                                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                                                    <ShoppingCart className="w-4 h-4 text-gray-500" />
                                                    <span>{store.dataValues?.orderCount || store.orderCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-sm text-gray-400 hidden lg:table-cell">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                    <span>{(store.created_at || store.createdAt) ? new Date(store.created_at || store.createdAt).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 hidden md:table-cell">
                                                {store.plan_id === 'enterprise' && (
                                                    <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20 w-fit flex items-center cursor-pointer" onClick={() => handleUpdatePlan(store.id, store.name, store.plan_id)}>Premium</span>
                                                )}
                                                {store.plan_id === 'installation' && (
                                                    <span className="px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20 w-fit flex items-center cursor-pointer" onClick={() => handleUpdatePlan(store.id, store.name, store.plan_id)}>Profesional</span>
                                                )}
                                                {(store.plan_id === 'starter' || !store.plan_id) && (
                                                    <span className="px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20 w-fit flex items-center cursor-pointer" onClick={() => handleUpdatePlan(store.id, store.name, store.plan_id)}>Esencial</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 hidden md:table-cell">
                                                {store.payment_status === 'paid' && (
                                                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        <DollarSign className="w-3 h-3 mr-1" /> Pagado
                                                    </span>
                                                )}
                                                {store.payment_status === 'overdue' && (
                                                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        <AlertTriangle className="w-3 h-3 mr-1" /> Vencido
                                                    </span>
                                                )}
                                                {store.payment_status === 'pending' && (
                                                    <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        <Clock className="w-3 h-3 mr-1" /> Pendiente
                                                    </span>
                                                )}
                                                {store.payment_status === 'cancelled' && (
                                                    <span className="px-2 py-1 rounded-full bg-gray-500/10 text-gray-400 text-xs font-medium border border-gray-500/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        <XCircle className="w-3 h-3 mr-1" /> Cancelado
                                                    </span>
                                                )}
                                                {store.payment_status === 'trial' && (
                                                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        <Clock className="w-3 h-3 mr-1" /> Prueba
                                                    </span>
                                                )}
                                                {!store.payment_status && (
                                                    <span className="px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 text-xs border border-gray-600/20 flex items-center w-fit cursor-pointer" onClick={() => handleUpdatePaymentStatus(store.id, store.name, store.payment_status)}>
                                                        — N/A
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5">
                                                {store.is_active ? (
                                                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 flex items-center w-fit">
                                                        <Power className="w-3 h-3 mr-1" /> Activa
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 flex items-center w-fit">
                                                        <PowerOff className="w-3 h-3 mr-1" /> Inactiva
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                                    {store.subdomain !== 'main' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleToggleStore(store.id, store.is_active)}
                                                                disabled={toggling === store.id}
                                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${store.is_active
                                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                                                                    }`}
                                                                title={store.is_active ? 'Desactivar' : 'Activar'}
                                                            >
                                                                {toggling === store.id ? (
                                                                    <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin"></div>
                                                                ) : store.is_active ? (
                                                                    <><PowerOff className="w-3.5 h-3.5 inline mr-1" />Desactivar</>
                                                                ) : (
                                                                    <><Power className="w-3.5 h-3.5 inline mr-1" />Activar</>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handlePauseStore(store.id, !!store.paused_at)}
                                                                disabled={toggling === store.id}
                                                                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${store.paused_at
                                                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                                                                    : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30'
                                                                    }`}
                                                                title={store.paused_at ? 'Reactivar servicio' : 'Pausar servicio'}
                                                            >
                                                                {store.paused_at ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStore(store.id, store.name)}
                                                                disabled={toggling === store.id}
                                                                className="px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                                                title="Eliminar empresa"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setBrandingStore(store)}
                                                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"
                                                                title="Personalizar tienda"
                                                            >
                                                                <Palette className="w-3.5 h-3.5 inline mr-1" />Estilo
                                                            </button>
                                                        </>
                                                    )}
                                                    <a
                                                        href={`https://${store.subdomain}.neonhub.es`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-600/50"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 inline mr-1" />Ver
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <div>
                    {/* Status filter pills */}
                    <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-gray-700/30 flex-wrap">
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'pending', label: '🕐 En Provisioning' },
                            { key: 'completed', label: '✅ Completadas' }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setRequestsFilter(key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                    requestsFilter === key
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                        : 'bg-gray-800/50 text-gray-400 border-gray-600/40 hover:border-gray-500/60 hover:text-gray-200'
                                }`}
                            >
                                {label}
                                {key === 'pending' && requests.filter(r => ['queued','processing','pending'].includes(r.status)).length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-[10px]">
                                        {requests.filter(r => ['queued','processing','pending'].includes(r.status)).length}
                                    </span>
                                )}
                                {key === 'completed' && requests.filter(r => r.status === 'completed').length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px]">
                                        {requests.filter(r => r.status === 'completed').length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700/50 bg-gray-900/30">
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Empresa / Dominio</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Cliente</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Plan</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                                <p>Cargando solicitudes...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-gray-400">
                                            <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                            <p>No hay solicitudes.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-700/20 transition-colors group">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                                        <Building2 className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{req.payload?.tenant_name || 'Desconocido'}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{req.payload?.subdomain}.neonhub.es</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2 text-gray-300 text-sm">
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                    <span>{req.payload?.owner_email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-sm text-gray-300 hidden md:table-cell">
                                                <span className="px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs border border-slate-500/20">
                                                    {req.payload?.plan_id || '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-sm text-gray-400 hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                    <span>{(req.created_at || req.createdAt) ? new Date(req.created_at || req.createdAt).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                {getStatusBadge(req.status)}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                {req.status !== 'completed' && (
                                                    <button
                                                        onClick={() => handleApprove(req.id)}
                                                        disabled={approving === req.id}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {approving === req.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                                Procesando...
                                                            </div>
                                                        ) : 'Aprobar y Crear'}
                                                    </button>
                                                )}
                                                {req.status === 'completed' && (
                                                    <span className="text-sm text-green-400">✓ Provisionado</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                    <div className="flex flex-col md:flex-row h-[700px] divide-y md:divide-y-0 md:divide-x divide-gray-700/50">
                        {/* Lista de tickets */}
                        <div className="w-full md:w-1/3 flex flex-col h-full bg-gray-900/30">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : filteredTickets.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No hay tickets de soporte.
                                    </div>
                                ) : (
                                    filteredTickets.map(ticket => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === ticket.id
                                                ? 'bg-blue-600/20 border-blue-500/50'
                                                : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-500/50'
                                                }`}
                                        >
                                            <h3 className="font-medium text-white line-clamp-1 mb-1">{ticket.subject}</h3>
                                            <div className="text-xs text-gray-400 mb-2 truncate">{ticket.customer_email}</div>
                                            <div className="flex items-center justify-between mt-2">
                                                {getStatusBadge(ticket.status)}
                                                <span className="text-xs text-gray-500">
                                                    {(ticket.created_at || ticket.createdAt) ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Detalle del ticket */}
                        <div className="w-full md:w-2/3 flex flex-col h-full bg-gray-800/20">
                            {selectedTicket ? (
                                <>
                                    <div className="p-5 border-b border-gray-700/50 flex justify-between items-start bg-gray-900/40">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{selectedTicket.subject}</h3>
                                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> {selectedTicket.customer_email}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(selectedTicket.status)}
                                            <select
                                                value={selectedTicket.status}
                                                onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                                                className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="open">Marcar como Abierto</option>
                                                <option value="in_progress">Marcar como En Progreso</option>
                                                <option value="resolved">Marcar como Resuelto</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                                        {/* Mensaje original del cliente */}
                                        <div className="flex flex-col items-start">
                                            <div className="bg-gray-700/50 border border-gray-600/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                                                <p className="text-sm text-gray-300 mb-1 font-medium">Cliente (Ticket Inicial)</p>
                                                <p className="text-white whitespace-pre-wrap">{selectedTicket.message}</p>
                                            </div>
                                        </div>

                                        {/* Respuestas */}
                                        {selectedTicket.responses && selectedTicket.responses.length > 0 && selectedTicket.responses.map((reply, i) => (
                                            <div key={reply.id || i} className={`flex flex-col ${reply.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 max-w-[85%] rounded-2xl ${reply.sender === 'admin'
                                                    ? 'bg-blue-600/20 border border-blue-500/30 rounded-tr-sm'
                                                    : 'bg-gray-700/50 border border-gray-600/50 rounded-tl-sm'
                                                    }`}>
                                                    <p className={`text-sm mb-1 font-medium ${reply.sender === 'admin' ? 'text-blue-300' : 'text-gray-300'}`}>
                                                        {reply.sender === 'admin' ? 'Admin / Soporte' : 'Cliente'}
                                                    </p>
                                                    <p className="text-white whitespace-pre-wrap">{reply.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Caja de respuesta */}
                                    <div className="p-4 border-t border-gray-700/50 bg-gray-900/60">
                                        <form onSubmit={handleReplyToTicket} className="flex gap-3">
                                            <input
                                                type="text"
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                placeholder="Escribe tu respuesta para el cliente..."
                                                className="flex-1 bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                                disabled={replying || selectedTicket.status === 'resolved'}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!replyMessage.trim() || replying || selectedTicket.status === 'resolved'}
                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 font-medium transition-colors"
                                            >
                                                {replying ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Responder'}
                                            </button>
                                        </form>
                                        {selectedTicket.status === 'resolved' && (
                                            <p className="text-xs text-green-400 mt-2 text-center">Ticket resuelto. Cambia el estado para volver a responder.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-3">
                                    <MessageSquare className="w-12 h-12 opacity-20" />
                                    <p>Selecciona un ticket para ver la conversación</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700/50 bg-gray-900/30">
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Fecha</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Empresa</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Concepto</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider text-right">Importe</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Método</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                                <p>Cargando historial de pagos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-gray-400">
                                            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                            <p>No hay registros de pagos aún.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-700/20 transition-colors">
                                            <td className="py-4 px-5 text-sm text-gray-300">
                                                {new Date(payment.payment_date).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-medium">{payment.store?.name || 'Sistema'}</span>
                                                    <span className="text-xs text-gray-500 font-mono uppercase">{payment.store?.subdomain}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-200">{payment.concept}</span>
                                                    {payment.notes && <span className="text-[10px] text-gray-500 line-clamp-1 italic">{payment.notes}</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <span className="text-white font-bold text-lg">
                                                    {(payment.amount_cents / 100).toFixed(2)}€
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                    payment.payment_method === 'stripe' 
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                    {payment.payment_method}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Domains & Routes Tab */}
                {activeTab === 'domains' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700/50 bg-gray-900/30">
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Empresa</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Dominio Personalizado</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider">Rutas Configuradas</th>
                                    <th className="py-4 px-5 font-medium text-xs text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                                <p>Cargando empresas...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStores.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center text-gray-400">
                                            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                            <p>No hay empresas registradas.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStores.map(store => {
                                        const urlMapping = store.url_mapping || {}
                                        const routeCount = Object.keys(urlMapping).length
                                        return (
                                            <tr key={store.id} className="hover:bg-gray-700/20 transition-colors">
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                                                            <Building2 className="w-5 h-5 text-cyan-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{store.name}</p>
                                                            <p className="text-xs text-gray-400">{store.subdomain}.neonhub.es</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5">
                                                    {store.custom_domain ? (
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="w-4 h-4 text-green-400" />
                                                            <span className="text-cyan-400 font-mono text-sm">{store.custom_domain}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 italic text-sm">No configurado</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-5">
                                                    {routeCount > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Link className="w-4 h-4 text-violet-400" />
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.keys(urlMapping).slice(0, 3).map(key => (
                                                                    <span key={key} className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs rounded border border-violet-500/20">
                                                                        {key}
                                                                    </span>
                                                                ))}
                                                                {routeCount > 3 && (
                                                                    <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded border border-gray-600/30">
                                                                        +{routeCount - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 italic text-sm">Sin rutas</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 text-right">
                                                    <button
                                                        onClick={() => setEditingStore(store)}
                                                        className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ml-auto"
                                                    >
                                                        <Globe className="w-4 h-4" />
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Store Branding Modal */}
            <StoreBrandingModal
                store={brandingStore}
                isOpen={!!brandingStore}
                onClose={() => setBrandingStore(null)}
                onUpdated={() => fetchStores()}
            />

            {/* Edit Tenant Domain/Routes Modal */}
            <EditTenantModal
                store={editingStore}
                isOpen={!!editingStore}
                onClose={() => setEditingStore(null)}
                onUpdated={() => {
                    fetchStores()
                    setEditingStore(null)
                }}
            />

        </div>
    );
};

export default SaaSAdminDashboard;
