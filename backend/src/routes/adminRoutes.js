const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenantController');
const { requireAuth } = require('../middleware/auth');
const storeMiddleware = require('../middleware/storeMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const uploadController = require('../controllers/uploadController');

// ─── endpoints globales del sistema (sin contexto de tenant) ──────────────────────
// hay que registrarlos ANTES del storeMiddleware global.
// protegidos con x-admin-secret (el mismo mecanismo que usan los flujos de n8n).

const requireAdminSecret = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    const expected = process.env.ADMIN_API_SECRET;
    if (!expected) return res.status(500).json({ success: false, message: 'Servidor mal configurado' });
    if (!secret || secret !== expected) return res.status(401).json({ success: false, message: 'No autorizado' });
    next();
};

router.get('/metrics/daily', requireAdminSecret, async (req, res) => {
    try {
        const { Store, Order, Customer, SupportTicket, PaymentRecord } = require('../models');
        const { Op } = require('sequelize');

        const now = new Date();
        const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayFilter  = { created_at: { [Op.between]: [startOfDay, endOfDay] } };

        const [new_orders, revenueRaw, new_customers, active_stores, failed_payments, tickets_open] =
            await Promise.all([
                Order.count({ where: todayFilter }),
                Order.sum('total_amount', { where: { ...todayFilter, payment_status: 'paid' } }),
                Customer.count({ where: todayFilter }),
                Store.count({ where: { subdomain: { [Op.ne]: 'main' }, payment_status: 'active' } }),
                Order.count({ where: { ...todayFilter, payment_status: 'failed' } }),
                SupportTicket.count({ where: { status: 'open' } })
            ]);

        const revenue = parseFloat((revenueRaw || 0).toFixed(2));

        // métricas SaaS globales (se mantienen por compatibilidad)
        const new_tenants = await Store.count({
            where: { subdomain: { [Op.ne]: 'main' }, created_at: { [Op.gte]: startOfDay } }
        });

        const [mrrPayments, mrrPlans] = await Promise.all([
            PaymentRecord.sum('amount_cents', { where: { created_at: { [Op.gte]: startOfMonth } } }),
            Store.sum('plan_price_cents', {
                where: { subdomain: { [Op.ne]: 'main' }, is_active: true, plan_price_cents: { [Op.not]: null } }
            })
        ]);
        const mrr = parseFloat((((mrrPayments > 0 ? mrrPayments : (mrrPlans || 0)) / 100)).toFixed(2));

        res.json({
            success: true,
            data: {
                new_orders,
                revenue,
                new_customers,
                active_stores,
                failed_payments,
                tickets_open,
                new_tenants,
                mrr,
                date: startOfDay.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Error in GET /admin/metrics/daily:', error);
        res.status(500).json({ success: false, message: 'Error fetching daily metrics', error: error.message });
    }
});

router.get('/saas-stats', requireAdminSecret, async (req, res) => {
    try {
        const { Store, User, Order, SupportTicket, sequelize } = require('../models');
        const { Op } = require('sequelize');

        const today = new Date();
        const startOfMonth    = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth  = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

        const ACTIVE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'];
        const REVENUE_STATUSES = ['delivered', 'completed'];
        const NOT_MAIN = { [Op.ne]: 'main' };

        const [
            totalStores,
            newStoresThisMonth,
            totalUsers,
            ordersThisMonth,
            revenueThisMonthRaw,
            openTickets,
            topStores
        ] = await Promise.all([
            Store.count({ where: { payment_status: 'active', subdomain: NOT_MAIN } }),
            Store.count({ where: { payment_status: 'active', subdomain: NOT_MAIN, created_at: { [Op.gte]: startOfMonth } } }),
            User.count({ where: { is_active: true, store_id: { [Op.ne]: null } } }),
            Order.count({ where: { status: { [Op.in]: ACTIVE_STATUSES }, created_at: { [Op.gte]: startOfMonth } } }),
            Order.sum('total_amount', { where: { status: { [Op.in]: REVENUE_STATUSES }, created_at: { [Op.gte]: startOfMonth } } }),
            SupportTicket.count({ where: { status: 'open' } }),
            Order.findAll({
                attributes: [
                    'store_id',
                    [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue']
                ],
                where: { status: { [Op.in]: REVENUE_STATUSES }, created_at: { [Op.gte]: startOfMonth } },
                include: [{ model: Store, as: 'store', attributes: ['name', 'subdomain'] }],
                group: ['Order.store_id', 'store.id'],
                order: [[sequelize.literal('revenue'), 'DESC']],
                limit: 3
            })
        ]);

        res.json({
            success: true,
            data: {
                date: today.toLocaleDateString('es-ES'),
                platform: {
                    total_stores: totalStores,
                    new_stores_this_month: newStoresThisMonth,
                    total_users: totalUsers
                },
                commerce: {
                    orders_this_month: ordersThisMonth,
                    revenue_this_month: parseFloat((revenueThisMonthRaw || 0).toFixed(2))
                },
                support: {
                    open_tickets: openTickets
                },
                top_stores: topStores.map(s => ({
                    name: s.store?.name,
                    subdomain: s.store?.subdomain,
                    revenue: parseFloat(s.dataValues.revenue || 0).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error in GET /admin/saas-stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching SaaS stats', error: error.message });
    }
});

// ─── endpoints con contexto de tenant ──────────────────────────────────────────────────
// cadena de responsabilidad:
// 1. Resolvemos la tienda (storeMiddleware)
// 2. Autenticamos al usuario (auth)
// 3. Verificamos que sea super admin (superAdminMiddleware)

router.use(storeMiddleware);
router.use(requireAuth);
router.use(superAdminMiddleware);

// --- rutas ---

router.post('/stores', TenantController.createStore);

router.get('/stores', TenantController.listStores);

router.get('/stores/:id', TenantController.getStoreDetails);

router.patch('/stores/:id/toggle', TenantController.toggleStoreActive);

router.patch('/stores/:id/pause', TenantController.pauseStore);

router.delete('/stores/:id', TenantController.deleteStore);

router.patch('/stores/:id/payment-status', TenantController.updatePaymentStatus);

router.get('/stores/:id/branding', TenantController.getStoreBranding);

router.patch('/stores/:id/branding', TenantController.updateStoreBranding);

router.post('/stores/:id/logo', TenantController.uploadStoreLogo);

router.post('/stores/:id/upload', (req, res, next) => {
    req.user = req.user || {};
    req.user.storeId = req.params.id;
    next();
}, uploadController.uploadImages, uploadController.processImages);

router.get('/plan-features', TenantController.getPlanFeatures);

router.post('/contact', requireAdminSecret, async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'Campos requeridos' });
    }

    try {
        const nodemailer = require('nodemailer');
        const transporter = process.env.EMAIL_HOST && process.env.EMAIL_USER
            ? nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
              })
            : {
                sendMail: async (o) => {
                    console.log(`📧 MOCK CONTACT | ${o.subject} | from ${o.replyTo}`);
                    return { messageId: 'mock' };
                },
              };

        const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        await transporter.sendMail({
            from:    process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>',
            to:      'soporte@neonhub.es',
            replyTo: `"${name}" <${email}>`,
            subject: `[Contacto NeonHub] ${subject} — ${name}`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0b0f1a;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b">
  <h2 style="color:#a78bfa;margin:0 0 4px">Nuevo mensaje de contacto</h2>
  <p style="color:#64748b;font-size:13px;margin:0 0 24px">Recibido desde neonhub.es/contacto</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#94a3b8;width:110px">Nombre</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#a78bfa">${email}</a></td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8">Asunto</td><td style="padding:8px 0">${subject}</td></tr>
  </table>
  <div style="margin-top:20px;padding:16px;background:#1e293b;border-radius:8px;border-left:3px solid #7c3aed">
    <p style="font-size:13px;color:#94a3b8;margin:0 0 8px">Mensaje:</p>
    <p style="font-size:14px;white-space:pre-wrap;margin:0">${safeMessage}</p>
  </div>
  <p style="margin-top:20px;font-size:12px;color:#475569">Responde directamente a este email para contactar con ${name}.</p>
</div>`,
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[POST /admin/contact]', err);
        res.status(500).json({ success: false, message: 'Error al enviar el email' });
    }
});

module.exports = router;
