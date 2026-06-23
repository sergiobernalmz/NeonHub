const { Op } = require('sequelize');
const { SupportTicket, sequelize } = require('../models');
const { emitNewReply, emitStatusChange, emitNewTicket } = require('../services/socketService');

const ticketController = {
    // rutas públicas (cliente)
    createTicket: async (req, res) => {
        try {
            const { customer_email, subject, message, priority } = req.body;

            if (!customer_email || !subject || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios'
                });
            }

            const ticket = await SupportTicket.create({
                customer_email,
                subject,
                message,
                priority: priority || 'normal',
                read_by_customer: true,
                read_by_admin: false,
                store_id: req.tenant?.id || null
            });

            // emitimos el evento en tiempo real al panel de admin
            emitNewTicket(ticket);

            return res.status(201).json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error creando ticket:', error);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    },

    getCustomerTickets: async (req, res) => {
        try {
            // el email viene del JWT verificado, no hay riesgo de IDOR
            const email = req.user?.email;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email requerido' });
            }

            const where = { customer_email: email };
            if (req.tenant?.id) {
                where.store_id = req.tenant.id;
            }

            const tickets = await SupportTicket.findAll({
                where,
                order: [['created_at', 'DESC']]
            });

            return res.json({ success: true, data: tickets });
        } catch (error) {
            console.error('Error obteniendo tickets del cliente:', error);
            return res.status(500).json({ success: false });
        }
    },

    // variante proxy server-side: crea el ticket con el email del body, autenticado via x-admin-secret (solo proxy landing)
    createTicketProxy: async (req, res) => {
        try {
            const { customer_email, subject, message, priority } = req.body;
            if (!customer_email || !subject || !message) {
                return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
            }
            const ticket = await SupportTicket.create({
                customer_email,
                subject,
                message,
                priority: priority || 'normal',
                read_by_customer: true,
                read_by_admin: false,
                ticket_type: 'neonhub_support'
            });
            emitNewTicket(ticket);
            return res.status(201).json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error creando ticket (proxy):', error);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    },

    // variante proxy server-side: respuesta con email del body, autenticado via x-admin-secret (solo proxy landing)
    addCustomerReplyProxy: async (req, res) => {
        try {
            const { id } = req.params;
            const { message, email } = req.body;
            if (!message || !email) {
                return res.status(400).json({ success: false, message: 'Mensaje y email requeridos' });
            }
            const ticket = await SupportTicket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }
            if (ticket.customer_email !== email) {
                return res.status(403).json({ success: false, message: 'No autorizado' });
            }
            const newReply = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                sender: 'customer',
                message,
                timestamp: new Date().toISOString()
            };
            const currentResponses = ticket.responses || [];
            await ticket.update({
                responses: [...currentResponses, newReply],
                status: ticket.status === 'resolved' ? 'open' : ticket.status,
                read_by_admin: false
            });
            emitNewReply(id, newReply, ticket);
            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error añadiendo respuesta (proxy):', error);
            return res.status(500).json({ success: false });
        }
    },

    // variante proxy server-side: email por query, autenticado via x-admin-secret (solo proxy landing)
    getCustomerTicketsProxy: async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email requerido' });
            }

            const where = { customer_email: email };
            if (req.tenant?.id) {
                where.store_id = req.tenant.id;
            }

            const tickets = await SupportTicket.findAll({
                where,
                order: [['created_at', 'DESC']]
            });

            return res.json({ success: true, data: tickets });
        } catch (error) {
            console.error('Error obteniendo tickets del cliente (proxy):', error);
            return res.status(500).json({ success: false });
        }
    },

    addCustomerReply: async (req, res) => {
        try {
            const { id } = req.params;
            const { message, email } = req.body;

            if (!message || !email) {
                return res.status(400).json({ success: false, message: 'Mensaje y email requeridos' });
            }

            const ticket = await SupportTicket.findByPk(id);

            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }

            if (ticket.customer_email !== email) {
                return res.status(403).json({ success: false, message: 'No autorizado' });
            }

            const newReply = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                sender: 'customer',
                message,
                timestamp: new Date().toISOString()
            };

            const currentResponses = ticket.responses || [];
            await ticket.update({
                responses: [...currentResponses, newReply],
                status: ticket.status === 'resolved' ? 'open' : ticket.status,
                read_by_admin: false
            });

            // emitimos el evento de respuesta en tiempo real
            emitNewReply(id, newReply, ticket);

            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error añadiendo respuesta:', error);
            return res.status(500).json({ success: false });
        }
    },

    markReadByCustomer: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email requerido' });
            }
            const ticket = await SupportTicket.findOne({
                where: { id: req.params.id, customer_email: email }
            });
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }
            await ticket.update({ read_by_customer: true });
            return res.json({ success: true });
        } catch (error) {
            console.error('Error marcando ticket como leído:', error);
            return res.status(500).json({ success: false });
        }
    },

    // rutas de administrador
    getAllTickets: async (req, res) => {
        try {
            const { status, search } = req.query;
            const where = req.tenant?.id ? { store_id: req.tenant.id } : {};
            if (status) {
                where.status = status;
            }
            if (search) {
                where[Op.or] = [
                    { customer_email: { [Op.iLike]: `%${search}%` } },
                    { subject: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const tickets = await SupportTicket.findAll({
                where,
                order: [['created_at', 'DESC']]
            });

            return res.json({ success: true, data: tickets });
        } catch (error) {
            console.error('Error listando tickets:', error);
            return res.status(500).json({ success: false });
        }
    },

    getTicketDetails: async (req, res) => {
        try {
            const where = { id: req.params.id };
            // aislamiento de tenant: el superadmin sin contexto puede acceder a cualquier ticket por PK
            if (req.tenant?.id) {
                where.store_id = req.tenant.id;
            }
            const ticket = await SupportTicket.findOne({ where });
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }
            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error detalles ticket:', error);
            return res.status(500).json({ success: false });
        }
    },

    updateTicketStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['open', 'in_progress', 'resolved'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Estado inválido' });
            }

            const ticket = await SupportTicket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }

            await ticket.update({ status });

            // emitimos el cambio de estado en tiempo real
            emitStatusChange(id, status);

            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error actualizando ticket:', error);
            return res.status(500).json({ success: false });
        }
    },

    slaCheck: async (req, res) => {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const tickets = await SupportTicket.findAll({
                where: {
                    priority: { [Op.in]: ['urgent', 'high'] },
                    status: { [Op.in]: ['open', 'in_progress'] },
                    created_at: { [Op.lt]: oneHourAgo },
                    // excluimos tickets que ya tienen al menos una respuesta de admin
                    [Op.and]: sequelize.literal(
                        `NOT EXISTS (
                            SELECT 1 FROM jsonb_array_elements("SupportTicket"."responses") AS r
                            WHERE r->>'sender' = 'admin'
                        )`
                    )
                },
                order: [['created_at', 'ASC']]
            });

            return res.json({
                success: true,
                count: tickets.length,
                data: tickets.map(t => ({
                    id: t.id,
                    subject: t.subject,
                    priority: t.priority,
                    status: t.status,
                    store_id: t.store_id,
                    customer_email: t.customer_email,
                    created_at: t.created_at
                }))
            });
        } catch (error) {
            console.error('Error en SLA check:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    storeTickets: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }
            const { status, priority, search, page = 1, limit = 20 } = req.query;
            const where = { store_id: req.tenant.id };
            if (status) where.status = status;
            if (priority) where.priority = priority;
            if (search) {
                where[Op.or] = [
                    { customer_email: { [Op.iLike]: `%${search}%` } },
                    { subject: { [Op.iLike]: `%${search}%` } }
                ];
            }
            const { count, rows } = await SupportTicket.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            });
            return res.json({ success: true, data: rows, total: count });
        } catch (error) {
            console.error('Error listando tickets de tienda:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    storeStats: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }
            const storeId = req.tenant.id;
            const [total, open, inProgress, resolved, unread] = await Promise.all([
                SupportTicket.count({ where: { store_id: storeId } }),
                SupportTicket.count({ where: { store_id: storeId, status: 'open' } }),
                SupportTicket.count({ where: { store_id: storeId, status: 'in_progress' } }),
                SupportTicket.count({ where: { store_id: storeId, status: 'resolved' } }),
                SupportTicket.count({ where: { store_id: storeId, read_by_admin: false } })
            ]);
            return res.json({ success: true, data: { total, open, in_progress: inProgress, resolved, unread } });
        } catch (error) {
            console.error('Error stats tickets:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    updateStoreTicketStatus: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }
            const { status } = req.body;
            if (!['open', 'in_progress', 'resolved'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Estado inválido' });
            }
            const ticket = await SupportTicket.findOne({
                where: { id: req.params.id, store_id: req.tenant.id }
            });
            if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            await ticket.update({ status, read_by_admin: true });
            emitStatusChange(req.params.id, status);
            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error actualizando estado ticket:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    addStoreReply: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }
            const { message } = req.body;
            if (!message) return res.status(400).json({ success: false, message: 'Mensaje requerido' });
            const ticket = await SupportTicket.findOne({
                where: { id: req.params.id, store_id: req.tenant.id }
            });
            if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            const reply = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                sender: 'admin',
                message,
                admin_name: req.user.firstName || req.user.username,
                timestamp: new Date().toISOString()
            };
            const responses = [...(ticket.responses || []), reply];
            await ticket.update({
                responses,
                read_by_customer: false,
                read_by_admin: true,
                status: ticket.status === 'open' ? 'in_progress' : ticket.status
            });
            emitNewReply(req.params.id, reply, ticket);
            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error añadiendo respuesta store:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    addAdminReply: async (req, res) => {
        try {
            const { id } = req.params;
            const { message } = req.body;

            if (!message) {
                return res.status(400).json({ success: false, message: 'Mensaje requerido' });
            }

            const ticket = await SupportTicket.findByPk(id);

            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
            }

            const newReply = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                sender: 'admin',
                message,
                timestamp: new Date().toISOString()
            };

            const currentResponses = ticket.responses || [];
            await ticket.update({
                responses: [...currentResponses, newReply],
                status: ticket.status === 'open' ? 'in_progress' : ticket.status,
                read_by_customer: false
            });

            // emitimos la respuesta en tiempo real
            emitNewReply(id, newReply, ticket);

            return res.json({ success: true, data: ticket });
        } catch (error) {
            console.error('Error añadiendo respuesta admin:', error);
            return res.status(500).json({ success: false });
        }
    }
};

module.exports = ticketController;
