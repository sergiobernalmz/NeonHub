const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');

const adminSecretMiddleware = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    const expected = process.env.ADMIN_API_SECRET;
    if (!secret || !expected || secret !== expected) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
};

// n8n WF3 — monitor de SLA (auth por x-admin-secret)
router.get('/sla-check', adminSecretMiddleware, ticketController.slaCheck);

// rutas para clientes — requieren autenticación JWT
router.post('/', authenticateToken, ticketController.createTicket);
// ruta JWT: el email viene de req.user (sin IDOR) — usada por el frontend de neonhub
router.get('/customer', authenticateToken, ticketController.getCustomerTickets);
// rutas con admin-secret — solo para el proxy server-side de la landing page
router.get('/customer-proxy', adminSecretMiddleware, ticketController.getCustomerTicketsProxy);
router.post('/customer-proxy', adminSecretMiddleware, ticketController.createTicketProxy);
router.post('/:id/reply-proxy', adminSecretMiddleware, ticketController.addCustomerReplyProxy);
router.post('/:id/reply', authenticateToken, ticketController.addCustomerReply);
router.patch('/:id/read-customer', authenticateToken, ticketController.markReadByCustomer);

// rutas para CEO/tienda — con contexto de tenant, sin necesidad de superAdminMiddleware
router.get('/store/stats', authenticateToken, requireRoleLevel(60), ticketController.storeStats);
router.get('/store', authenticateToken, requireRoleLevel(60), ticketController.storeTickets);
router.patch('/store/:id/status', authenticateToken, requireRoleLevel(60), ticketController.updateStoreTicketStatus);
router.post('/store/:id/reply', authenticateToken, requireRoleLevel(60), ticketController.addStoreReply);

router.use('/admin', authenticateToken, superAdminMiddleware);
router.get('/admin', ticketController.getAllTickets);
router.get('/admin/:id', ticketController.getTicketDetails);
router.patch('/admin/:id/status', ticketController.updateTicketStatus);
router.post('/admin/:id/reply', ticketController.addAdminReply);

module.exports = router;
