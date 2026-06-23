const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const uploadController = require('../controllers/uploadController');
const { sequelize } = require('../models');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }
  next();
});

const requireAdminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) {
    return res.status(500).json({ success: false, message: 'Servidor mal configurado' });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
};

router.post('/checkout-session', billingController.createCheckoutSession);
router.post('/stripe/webhook', billingController.handleStripeWebhook);
router.get('/provisioning-status', billingController.getProvisioningStatus);
router.get('/session-info', billingController.getCheckoutSessionInfo);

// ── GET /billing/check-subdomain — disponibilidad de subdominio ───────────────
router.get('/check-subdomain', async (req, res) => {
  try {
    const { Store } = require('../models');
    const sub = String(req.query.sub || req.query.subdomain || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!sub || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(sub)) {
      return res.json({ available: false, reason: 'invalid' });
    }
    const existing = await Store.findOne({ where: { subdomain: sub }, attributes: ['id'] });
    res.json({ available: !existing });
  } catch (error) {
    console.error('check-subdomain error:', error);
    res.status(500).json({ available: false, reason: 'error' });
  }
});

router.get('/user-tenants', billingController.getUserTenants);
router.get('/user-stores', billingController.getUserStores);
router.get('/user-store-status', requireAdminSecret, billingController.getUserStoreStatus);

// rutas admin protegidas (requieren cabecera x-admin-secret)
router.get('/admin/provisioning-requests', requireAdminSecret, billingController.getProvisioningRequests);
router.post('/admin/provisioning-requests/:id/approve', requireAdminSecret, billingController.approveProvisioningRequest);

// borramos los jobs de provisioning completados
router.delete('/admin/provisioning-requests/completed', requireAdminSecret, async (req, res) => {
  try {
    const { ProvisioningJob } = require('../models');
    const deleted = await ProvisioningJob.destroy({ where: { status: 'completed' } });
    res.json({ success: true, message: `${deleted} solicitudes completadas eliminadas`, data: { deleted } });
  } catch (error) {
    console.error('Delete completed provisioning error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// endpoints de gestión de tiendas (para el panel admin de la landing)
router.get('/admin/stores', requireAdminSecret, async (req, res) => {
  try {
    const { Store, User, Product, Order, sequelize } = require('../models');
    const stores = await Store.findAll({
      attributes: [
        'id', 'name', 'subdomain', 'is_active', 'settings', 'created_at', 'updated_at',
        'plan_id', 'plan_price_cents', 'billing_start_date', 'next_payment_date',
        'payment_status', 'stripe_customer_id', 'stripe_subscription_id', 'paused_at', 'paused_reason',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('users.id'))), 'userCount'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('products.id'))), 'productCount'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('orders.id'))), 'orderCount']
      ],
      include: [
        { model: User, as: 'users', attributes: [], required: false },
        { model: Product, as: 'products', attributes: [], required: false },
        { model: Order, as: 'orders', attributes: [], required: false }
      ],
      group: ['Store.id'],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('Admin list stores error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/stores/:id/toggle', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    if (store.subdomain === 'main') return res.status(400).json({ success: false, message: 'No se puede desactivar la tienda principal' });

    store.is_active = !store.is_active;
    if (store.is_active) { store.paused_at = null; store.paused_reason = null; }
    await store.save();

    res.json({ success: true, message: `Tienda ${store.is_active ? 'activada' : 'desactivada'}`, data: { id: store.id, name: store.name, is_active: store.is_active } });
  } catch (error) {
    console.error('Admin toggle store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/stores/:id/pause', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    if (store.subdomain === 'main') return res.status(400).json({ success: false, message: 'No se puede pausar la tienda principal' });

    if (store.paused_at) {
      store.is_active = true; store.paused_at = null; store.paused_reason = null;
      await store.save();
      return res.json({ success: true, message: 'Servicio reactivado', data: { id: store.id, is_active: true, paused_at: null } });
    } else {
      const { reason } = req.body || {};
      store.is_active = false; store.paused_at = new Date(); store.paused_reason = reason || 'Pausado por administrador';
      await store.save();
      return res.json({ success: true, message: 'Servicio pausado', data: { id: store.id, is_active: false, paused_at: store.paused_at } });
    }
  } catch (error) {
    console.error('Admin pause store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/admin/stores/:id', requireAdminSecret, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { Store, User } = require('../models');
    const store = await Store.findByPk(req.params.id, { transaction: t, paranoid: false });
    if (!store) { await t.rollback(); return res.status(404).json({ success: false, message: 'Tienda no encontrada' }); }
    if (store.subdomain === 'main') { await t.rollback(); return res.status(400).json({ success: false, message: 'No se puede eliminar la tienda principal' }); }
    if (store.subdomain === 'demo') { await t.rollback(); return res.status(400).json({ success: false, message: 'No se puede eliminar la tienda demo' }); }

    const storeId = store.id;
    const storeName = store.name;
    const subdomain = store.subdomain;

    // obtenemos los usuarios para limpiar landing_db (columna store_id) + user_stores (membresía)
    const storeUsers = await User.findAll({ where: { store_id: storeId }, paranoid: false, transaction: t });
    const userEmails = storeUsers.map(u => u.email);
    const userStoreRows = await sequelize.query(
      'SELECT DISTINCT user_id FROM user_stores WHERE store_id = :sid',
      { replacements: { sid: storeId }, transaction: t, type: sequelize.QueryTypes.SELECT }
    );
    const userIds = [...new Set([
      ...storeUsers.map(u => u.id),
      ...userStoreRows.map(r => r.user_id)
    ])];

    const run = (q, replacements) => sequelize.query(q, { replacements, transaction: t });

    // 1. líneas de factura — la dependencia más profunda (antes que facturas y usuarios)
    await run('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE store_id = :sid) OR customer_id IN (SELECT id FROM customers WHERE store_id = :sid))', { sid: storeId });

    // 2. facturas — tienen que ir antes que los usuarios (invoices.created_by → FK usuarios)
    await run('DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE store_id = :sid) OR customer_id IN (SELECT id FROM customers WHERE store_id = :sid)', { sid: storeId });

    // 2b. Facturas cross-store: creadas por usuarios de esta tienda pero con orders/customers de otras tiendas
    if (userIds.length > 0) {
      await run('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE created_by IN (:ids))', { ids: userIds });
      await run('DELETE FROM invoices WHERE created_by IN (:ids)', { ids: userIds });
    }

    // 3. devoluciones — dependen de pedidos y tienda
    await run('DELETE FROM returns WHERE store_id = :sid', { sid: storeId });

    // 4. limpieza dependiente de usuarios (todo tiene que ir antes que DELETE FROM users)
    if (userIds.length > 0) {
      await run('DELETE FROM user_sessions WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM sso_tokens WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM user_permissions WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM activation_tokens WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (:ids))', { ids: userIds });
      await run('DELETE FROM carts WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM report_comments WHERE report_id IN (SELECT id FROM reports WHERE reporter_id IN (:ids) OR assigned_to IN (:ids))', { ids: userIds });
      await run('DELETE FROM reports WHERE reporter_id IN (:ids) OR assigned_to IN (:ids)', { ids: userIds });
      await run('DELETE FROM notifications WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM sustainability_metrics WHERE recorded_by IN (:ids)', { ids: userIds });
      await run('DELETE FROM user_roles WHERE user_id IN (:ids)', { ids: userIds });
      await run('DELETE FROM users WHERE id IN (:ids)', { ids: userIds });
    }

    // 5. limpieza de FKs de la tienda
    await run('DELETE FROM transactions WHERE order_id IN (SELECT id FROM orders WHERE store_id = :sid)', { sid: storeId });
    await run('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id = :sid)', { sid: storeId });
    await run('DELETE FROM orders WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM support_tickets WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM discount_codes WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM audit_logs WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM payment_records WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM provisioning_jobs WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM cart_items WHERE product_id IN (SELECT id FROM products WHERE store_id = :sid)', { sid: storeId });
    await run('DELETE FROM products WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM categories WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM customers WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM sso_tokens WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM user_permissions WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM activation_tokens WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM user_stores WHERE store_id = :sid', { sid: storeId });
    await run('DELETE FROM user_roles WHERE store_id = :sid', { sid: storeId });

    // 6. borrado físico de la tienda
    await run('DELETE FROM stores WHERE id = :sid', { sid: storeId });

    // eliminamos el schema del tenant
    const schemaName = `t_${storeId.replace(/-/g, '').toLowerCase()}`;
    await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`, { transaction: t }).catch(() => {});

    await t.commit();

    // limpiamos landing_db fuera de la transacción
    try {
      const pg = require('pg');
      const landingPool = new pg.Pool({
        host: process.env.LANDING_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.LANDING_DB_PORT || '5434'),
        database: process.env.LANDING_DB_NAME || 'landing_db',
        user: process.env.LANDING_DB_USER || 'landing',
        password: process.env.LANDING_DB_PASSWORD,
        max: 2
      });
      if (userEmails.length > 0) {
        for (const email of userEmails) {
          await landingPool.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
          await landingPool.query('DELETE FROM users WHERE email = $1', [email]);
        }
      }
      await landingPool.end();
    } catch (e) { console.error('Landing DB cleanup error:', e.message); }

    res.json({ success: true, message: `"${storeName}" eliminada permanentemente (${storeUsers.length} usuarios, schema ${schemaName})`, data: { id: storeId, name: storeName, usersDeleted: storeUsers.length } });
  } catch (error) {
    await t.rollback();
    console.error('Admin delete store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/stores/:id/payment-status', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const { payment_status, next_payment_date } = req.body;
    const validStatuses = ['paid', 'pending', 'overdue', 'cancelled', 'trial'];
    if (payment_status && !validStatuses.includes(payment_status)) {
      return res.status(400).json({ success: false, message: `Estado inválido. Válidos: ${validStatuses.join(', ')}` });
    }

    const updates = {};
    if (payment_status) updates.payment_status = payment_status;
    if (next_payment_date) updates.next_payment_date = next_payment_date;
    if (payment_status === 'paid' && !next_payment_date) {
      const nextDate = new Date(store.next_payment_date || new Date());
      nextDate.setMonth(nextDate.getMonth() + 1);
      updates.next_payment_date = nextDate.toISOString().split('T')[0];
    }
    if (payment_status === 'cancelled') updates.is_active = false;

    await store.update(updates);
    res.json({ success: true, message: 'Estado de pago actualizado', data: { id: store.id, payment_status: store.payment_status, next_payment_date: store.next_payment_date } });
  } catch (error) {
    console.error('Admin payment status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// extendemos el periodo de prueba (admin)
router.patch('/admin/stores/:id/extend-trial', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const days = parseInt(req.body.days);
    if (!days || days < 1 || days > 365) {
      return res.status(400).json({ success: false, message: 'days debe ser un número entre 1 y 365' });
    }

    const now = new Date();
    const base = store.trial_ends_at && new Date(store.trial_ends_at) > now
      ? new Date(store.trial_ends_at)
      : now;
    base.setDate(base.getDate() + days);

    const remainingDays = Math.ceil((base - now) / (1000 * 60 * 60 * 24));
    const totalDays = store.created_at
      ? Math.ceil((base - new Date(store.created_at)) / (1000 * 60 * 60 * 24))
      : null;

    await store.update({ trial_ends_at: base, payment_status: 'trial', is_active: true });
    res.json({
      success: true,
      message: `Trial extendido — ${remainingDays} días restantes`,
      data: { id: store.id, trial_ends_at: base, remaining_days: remainingDays, total_days: totalDays }
    });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// obtenemos todas las tiendas a las que pertenece un usuario (admin)
router.get('/admin/users/:id/stores', requireAdminSecret, async (req, res) => {
  try {
    const { QueryTypes } = require('sequelize');
    const stores = await sequelize.query(`
      SELECT
        us.store_id,
        s.name        AS store_name,
        s.subdomain,
        s.payment_status,
        s.trial_ends_at,
        s.is_active,
        r.name        AS role_name,
        r.display_name AS role_display_name
      FROM user_stores us
      JOIN stores s ON s.id = us.store_id
      LEFT JOIN user_roles ur ON ur.user_id = us.user_id AND ur.store_id = us.store_id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE us.user_id = :userId
      ORDER BY s.name ASC
    `, { replacements: { userId: req.params.id }, type: QueryTypes.SELECT });
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('Get user stores error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// quitamos a un usuario de una tienda concreta (admin)
router.delete('/admin/users/:userId/stores/:storeId', requireAdminSecret, async (req, res) => {
  try {
    const { UserRole, UserStore } = require('../models');
    await sequelize.transaction(async (t) => {
      await UserRole.destroy({ where: { user_id: req.params.userId, store_id: req.params.storeId }, transaction: t });
      await UserStore.destroy({ where: { user_id: req.params.userId, store_id: req.params.storeId }, transaction: t });
    });
    res.json({ success: true, message: 'Usuario eliminado de la tienda' });
  } catch (error) {
    console.error('Remove user from store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// actualizamos el plan de una tienda (admin)
router.patch('/admin/stores/:id/plan', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const { plan_id } = req.body;
    const validPlans = ['starter', 'installation', 'enterprise'];
    if (!plan_id || !validPlans.includes(plan_id)) {
      return res.status(400).json({ success: false, message: `Plan inválido. Válidos: ${validPlans.join(', ')}` });
    }

    const planPricing = { starter: 49900, installation: 99900, enterprise: 149900 };
    const planFeatures = {
      starter: { canCustomLogo: false, canCustomColors: false, canCustomFavicon: false },
      installation: { canCustomLogo: true, canCustomColors: true, canCustomFavicon: true },
      enterprise: { canCustomLogo: true, canCustomColors: true, canCustomFavicon: true }
    };
    const planNames = { starter: 'Esencial', installation: 'Profesional', enterprise: 'Premium' };

    const currentSettings = store.settings || {};
    await store.update({
      plan_id,
      plan_price_cents: planPricing[plan_id],
      settings: {
        ...currentSettings,
        plan_id,
        plan_features: planFeatures[plan_id]
      }
    });

    const features = planFeatures[plan_id];
    const enabledFeatures = [];
    if (features.canCustomLogo) enabledFeatures.push('Logo personalizado');
    if (features.canCustomColors) enabledFeatures.push('Colores personalizados');
    if (features.canCustomFavicon) enabledFeatures.push('Favicon personalizado');

    const featureMsg = enabledFeatures.length > 0
      ? ` Funcionalidades activadas: ${enabledFeatures.join(', ')}.`
      : ' Plan básico sin personalización de marca.';

    res.json({
      success: true,
      message: `Plan actualizado a ${planNames[plan_id]}.${featureMsg}`,
      data: { id: store.id, plan_id: store.plan_id, features: planFeatures[plan_id] }
    });
  } catch (error) {
    console.error('Admin update plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// resumen de facturación (admin)
router.get('/admin/billing-summary', requireAdminSecret, async (req, res) => {
  try {
    const { getBillingSummary } = require('../services/billingCheckService');
    const summary = await getBillingSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Billing summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// forzamos la comprobación de pagos vencidos (admin)
router.post('/admin/check-overdue', requireAdminSecret, async (req, res) => {
  try {
    const { checkOverduePayments } = require('../services/billingCheckService');
    const result = await checkOverduePayments();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Check overdue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// Payment Records (historial de pagos por tienda)
// ═══════════════════════════════════════════════

// Ver historial global de pagos (todas las tiendas)
router.get('/admin/payments', requireAdminSecret, async (req, res) => {
  try {
    const { PaymentRecord, Store } = require('../models');
    const payments = await PaymentRecord.findAll({
      include: [{
        model: Store,
        as: 'store',
        attributes: ['id', 'name', 'subdomain']
      }],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
      limit: 100 // limitamos a los últimos 100 para no cargar demasiado
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Get global payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Registrar un pago
router.post('/admin/stores/:id/payments', requireAdminSecret, async (req, res) => {
  try {
    const { Store, PaymentRecord } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const { amount_cents, concept, payment_method, notes, payment_date } = req.body;
    if (!amount_cents || !concept) {
      return res.status(400).json({ success: false, message: 'amount_cents y concept son obligatorios' });
    }
    if (typeof amount_cents !== 'number' || amount_cents <= 0) {
      return res.status(400).json({ success: false, message: 'amount_cents debe ser un número positivo' });
    }

    const validMethods = ['manual', 'stripe', 'transferencia', 'efectivo', 'otro'];
    const method = validMethods.includes(payment_method) ? payment_method : 'manual';

    const record = await PaymentRecord.create({
      store_id: store.id,
      amount_cents: Math.round(amount_cents),
      concept: String(concept).substring(0, 255),
      payment_method: method,
      notes: notes ? String(notes).substring(0, 1000) : null,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      recorded_by: 'admin'
    });

    // Actualizar payment_status a paid y next_payment_date al siguiente mes si es mensualidad
    if (concept.toLowerCase().includes('mensualidad') || concept.toLowerCase().includes('suscripción')) {
      const nextDate = new Date(payment_date || Date.now());
      nextDate.setMonth(nextDate.getMonth() + 1);
      await store.update({
        payment_status: 'paid',
        next_payment_date: nextDate.toISOString().split('T')[0]
      });
    }

    res.json({ success: true, message: 'Pago registrado correctamente', data: record });
  } catch (error) {
    console.error('Register payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ver historial de pagos de una tienda
router.get('/admin/stores/:id/payments', requireAdminSecret, async (req, res) => {
  try {
    const { PaymentRecord } = require('../models');
    const payments = await PaymentRecord.findAll({
      where: { store_id: req.params.id },
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          total_payments: payments.length,
          total_paid_cents: totalPaid,
          total_paid_formatted: `${(totalPaid / 100).toFixed(2)} €`
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar un registro de pago
router.delete('/admin/payments/:id', requireAdminSecret, async (req, res) => {
  try {
    const { PaymentRecord } = require('../models');
    const record = await PaymentRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    await record.destroy();
    res.json({ success: true, message: 'Registro de pago eliminado' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// Configuración Enterprise de la Tienda
// ═══════════════════════════════════════════════

// Obtener configuración enterprise de una tienda
router.get('/admin/stores/:id/enterprise-config', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const defaultConfig = {
      // Secciones de la tienda
      sections: {
        hero: true,
        featured_products: true,
        categories: true,
        new_arrivals: true,
        sustainability: true,
        testimonials: false,
        newsletter: true,
        custom_banner: false
      },
      // Features del panel admin del cliente
      features: {
        products: true,
        gallery: true,
        orders: true,
        customers: true,
        analytics: true,
        sustainability: true,
        reports: true,
        invoices: true,
        tickets: true,
        certifications: true
      },
      // Diseño personalizado
      design: {
        layout: 'default',
        custom_css: '',
        custom_header_html: '',
        custom_footer_html: '',
        show_powered_by: true,
        font_family: 'default',
        font_weight: 'regular',
        button_style: 'rounded',
        gradient_enabled: false,
        gradient_start: '#0ea5e9',
        gradient_end: '#6366f1',
        gradient_direction: 'to right',
        header_text: '',
        footer_text: '',
        announcement_text: '',
        announcement_color: '#f59e0b',
        social_links: {
          instagram: '',
          twitter: '',
          facebook: '',
          tiktok: ''
        }
      },
      // Límites
      limits: {
        max_products: -1,
        max_users: -1,
        max_categories: -1,
        max_storage_mb: 5000
      }
    };

    const enterpriseConfig = store.settings?.enterprise_config || defaultConfig;
    const branding = store.settings?.branding || {};
    const theme = store.settings?.theme || {};
    
    enterpriseConfig.branding = {
      store_name: store.name,
      store_description: branding.store_description || '',
      logo_url: branding.logo_url || null,
      favicon_url: branding.favicon_url || null,
      primary_color: branding.primary_color || theme.primaryColor || '#0ea5e9',
      secondary_color: branding.secondary_color || '#6366f1',
      accent_color: branding.accent_color || '#22d3ee',
      bg_color: branding.bg_color || (theme.darkMode ? '#0f172a' : '#ffffff')
    };

    res.json({ success: true, data: { store_id: store.id, store_name: store.name, plan_id: store.plan_id, config: enterpriseConfig } });
  } catch (error) {
    console.error('Get enterprise config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subir imágenes para la configuración enterprise
router.post('/admin/stores/:id/upload', requireAdminSecret, (req, res, next) => {
  req.user = { storeId: req.params.id };
  next();
}, uploadController.uploadImages, uploadController.processImages);

// Actualizar configuración enterprise de una tienda
router.patch('/admin/stores/:id/enterprise-config', requireAdminSecret, async (req, res) => {
  try {
    const { Store } = require('../models');
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const { config } = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, message: 'config es obligatorio y debe ser un objeto' });
    }

    const { branding, ...enterprise_config } = config;
    if (branding && branding.store_name) {
      store.name = branding.store_name;
    }

    const currentSettings = store.settings || {};
    const currentBranding = currentSettings.branding || {};
    const updatedBranding = {
      ...currentBranding,
      ...(branding && {
        store_description: branding.store_description,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        bg_color: branding.bg_color,
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url
      })
    };

    await store.update({
      name: store.name,
      settings: {
        ...currentSettings,
        enterprise_config,
        branding: updatedBranding,
        theme: {
          ...currentSettings.theme,
          primaryColor: branding && branding.primary_color ? branding.primary_color : currentSettings.theme?.primaryColor
        }
      }
    });

    res.json({ success: true, message: 'Configuración enterprise actualizada', data: { config } });
  } catch (error) {
    console.error('Update enterprise config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// endpoints de gestión de usuarios (para el panel admin de la landing)
// ═══════════════════════════════════════════════

router.get('/admin/users', requireAdminSecret, async (req, res) => {
  try {
    const { User, Role, Store } = require('../models');
    const { Op } = require('sequelize');
    const { store_id } = req.query;
    const where = {
      email: { [Op.notIn]: ['demo@neonhub.es', 'superadmin@neonhub.es'] }
    };
    if (store_id) where.store_id = store_id;

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'store_id', 'created_at', 'locked_until', 'login_attempts'],
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'], through: { attributes: [] } },
        { model: Store, as: 'store', attributes: ['id', 'name', 'subdomain'] },
        { model: Store, as: 'stores', attributes: ['id', 'name', 'subdomain'], through: { attributes: [] } }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/stores/:id/detail', requireAdminSecret, async (req, res) => {
  try {
    const { Store, User, Role, Product, Order, Customer, sequelize } = require('../models');
    const store = await Store.findByPk(req.params.id, {
      attributes: [
        'id', 'name', 'subdomain', 'is_active', 'settings', 'created_at',
        'plan_id', 'plan_price_cents', 'billing_start_date', 'next_payment_date',
        'payment_status', 'paused_at', 'paused_reason'
      ]
    });
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const users = await User.findAll({
      where: { store_id: store.id },
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'created_at'],
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'], through: { where: { store_id: store.id }, attributes: [] } }],
      order: [['created_at', 'ASC']]
    });

    const [counts] = await sequelize.query(
      `SELECT 
        (SELECT COUNT(*) FROM customers WHERE store_id = :storeId) as customer_count,
        (SELECT COUNT(*) FROM products WHERE store_id = :storeId) as product_count,
        (SELECT COUNT(*) FROM orders WHERE store_id = :storeId) as order_count,
        (SELECT COUNT(*) FROM categories WHERE store_id = :storeId) as category_count`,
      { replacements: { storeId: store.id }, type: sequelize.QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        store: store.toJSON(),
        users,
        stats: {
          customerCount: parseInt(counts.customer_count) || 0,
          productCount: parseInt(counts.product_count) || 0,
          orderCount: parseInt(counts.order_count) || 0,
          categoryCount: parseInt(counts.category_count) || 0,
          userCount: users.length
        }
      }
    });
  } catch (error) {
    console.error('Admin store detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/stores/:id/customers', requireAdminSecret, async (req, res) => {
  try {
    const { User, Role, Customer, sequelize } = require('../models');
    const storeId = req.params.id;

    const customerUsers = await User.findAll({
      where: { store_id: storeId },
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'created_at'],
      include: [{
        model: Role,
        as: 'roles',
        where: { name: 'customer' },
        attributes: ['id', 'name', 'display_name'],
        through: { attributes: [] }
      }],
      order: [['created_at', 'DESC']]
    });

    const customerRecords = await Customer.findAll({
      where: { store_id: storeId },
      attributes: ['id', 'customer_code', 'first_name', 'last_name', 'email', 'company_name', 'customer_type', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    const orderCounts = customerRecords.length > 0
      ? await sequelize.query(
          'SELECT customer_id, COUNT(*) as order_count FROM orders WHERE customer_id IN (:ids) GROUP BY customer_id',
          { replacements: { ids: customerRecords.map(c => c.id) }, type: sequelize.QueryTypes.SELECT }
        )
      : [];
    const orderCountMap = Object.fromEntries(orderCounts.map(r => [r.customer_id, parseInt(r.order_count)]));

    res.json({
      success: true,
      data: {
        user_customers: customerUsers,
        customer_records: customerRecords.map(c => ({ ...c.toJSON(), order_count: orderCountMap[c.id] || 0 }))
      }
    });
  } catch (error) {
    console.error('Admin store customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/users', requireAdminSecret, async (req, res) => {
  try {
    const { User, Role, Store } = require('../models');
    const bcrypt = require('bcryptjs');
    const { username, email, password, first_name, last_name, store_id, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'username, email y password son obligatorios' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ya existe un usuario con ese email' });
    }

    if (store_id) {
      const store = await Store.findByPk(store_id);
      if (!store) return res.status(400).json({ success: false, message: 'Tienda no encontrada' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      first_name: first_name || '',
      last_name: last_name || '',
      store_id: store_id || null,
      is_active: true,
      email_verified: true
    });

    // asignamos el rol si se ha indicado
    if (role) {
      const roleRecord = await Role.findOne({ where: { name: role } });
      if (roleRecord) await user.addRole(roleRecord);
    }

    const created = await User.findByPk(user.id, {
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'store_id', 'created_at'],
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'], through: { attributes: [] } },
        { model: Store, as: 'store', attributes: ['id', 'name', 'subdomain'] }
      ]
    });

    res.json({ success: true, message: 'Usuario creado', data: created });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/users/:id', requireAdminSecret, async (req, res) => {
  try {
    const { User, Role, Store } = require('../models');
    const bcrypt = require('bcryptjs');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { username, email, password, first_name, last_name, store_id, is_active, role } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (store_id !== undefined && store_id !== null) {
      if (store_id) {
        const store = await Store.findByPk(store_id);
        if (!store) return res.status(400).json({ success: false, message: 'Tienda no encontrada' });
        updates.store_id = store_id;
      }
    } else if (store_id === null) {
      updates.store_id = null;
    }
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 12);
    }

    await user.update(updates);

    // actualizamos el rol si se ha enviado
    if (role) {
      const roleRecord = await Role.findOne({ where: { name: role } });
      if (roleRecord) {
        await user.setRoles([roleRecord]);
      }
    }

    const updated = await User.findByPk(user.id, {
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'store_id', 'created_at'],
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'], through: { attributes: [] } },
        { model: Store, as: 'store', attributes: ['id', 'name', 'subdomain'] }
      ]
    });

    res.json({ success: true, message: 'Usuario actualizado', data: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/users/:id/unlock', requireAdminSecret, async (req, res) => {
  try {
    const { User, AuditLog } = require('../models');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await user.resetLoginAttempts();

    AuditLog.create({
      user_id: user.id,
      store_id: user.store_id || null,
      action: 'admin_unlock',
      resource_type: 'user',
      resource_id: user.id,
      description: `Admin desbloqueó la cuenta de ${user.email}`,
      metadata: { admin_action: true }
    }).catch(e => console.error('[admin unlock] audit log error:', e.message));

    res.json({ success: true, message: `Cuenta de ${user.email} desbloqueada` });
  } catch (error) {
    console.error('[admin unlock] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/admin/users/:id', requireAdminSecret, async (req, res) => {
  try {
    const { User, Store, Role } = require('../models');
    const confirm = req.query.confirm; // 'user', 'both' o sin definir
    
    const user = await User.findByPk(req.params.id, { paranoid: false, include: [{ model: Role, as: 'roles' }] });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // comprobamos si el usuario es CEO de alguna tienda
    const isCeo = user.roles?.some(r => r.name === 'ceo' || r.name === 'superadmin' || r.scope === 'platform');
    const store = user.store_id ? await Store.findByPk(user.store_id, { paranoid: false }) : null;

    // si es CEO y aún no hay confirmación, la pedimos
    if (isCeo && store && !confirm) {
      return res.json({
        success: false,
        requiresConfirmation: true,
        message: `${user.username} es CEO de "${store.name}" (${store.subdomain}). ¿Qué deseas hacer?`,
        associatedStore: { id: store.id, name: store.name, subdomain: store.subdomain }
      });
    }

    // si confirm=both borramos el usuario Y la tienda (limpieza completa)
    if (confirm === 'both' && store) {
      // simulamos una petición de borrado de tienda
      const storeDeleteUrl = `${req.protocol}://${req.get('host')}/api/billing/admin/stores/${store.id}`;
      const axios = require('axios');
      await axios.delete(storeDeleteUrl, { headers: { 'x-admin-secret': req.headers['x-admin-secret'] } });
      return res.json({ success: true, message: `Usuario "${user.username}" y tienda "${store.name}" eliminados permanentemente` });
    }

    // borramos solo el usuario (force: true = borrado físico)
    const userId = user.id;
    const userEmail = user.email;
    const userName = user.username;

    // limpiamos las FKs de más profunda a más superficial (todo antes de DELETE users)
    const { sequelize } = require('../models');
    const runU = (q) => sequelize.query(q, { replacements: { uid: userId } }).catch(() => {});

    // 1. líneas del carrito antes que el carrito (CASCADE, pero explícito)
    await runU('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = :uid)');
    await runU('DELETE FROM carts WHERE user_id = :uid');

    // 2. facturas (invoices.created_by → FK users NO ACTION — tiene que ir antes de DELETE users)
    await runU('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE created_by = :uid)');
    await runU('DELETE FROM invoices WHERE created_by = :uid');

    // 3. sesiones y tokens (CASCADE, pero explícito)
    await runU('DELETE FROM user_sessions WHERE user_id = :uid');
    await runU('DELETE FROM sso_tokens WHERE user_id = :uid');
    await runU('DELETE FROM user_permissions WHERE user_id = :uid');
    await runU('DELETE FROM activation_tokens WHERE user_id = :uid');
    // password_change_tokens no tiene FK — se busca por email
    await runU('DELETE FROM password_change_tokens WHERE email = (SELECT email FROM users WHERE id = :uid)');

    // 4. membresías de tienda y devoluciones (CASCADE, pero explícito)
    await runU('DELETE FROM user_stores WHERE user_id = :uid');
    await runU('DELETE FROM returns WHERE customer_id IN (SELECT id FROM customers WHERE email = (SELECT email FROM users WHERE id = :uid))');

    // 5. limpieza de FKs restantes (NO ACTION — tiene que ser explícito)
    await runU('DELETE FROM notifications WHERE user_id = :uid');
    await runU('DELETE FROM audit_logs WHERE user_id = :uid');
    await runU('DELETE FROM sustainability_metrics WHERE recorded_by = :uid');
    await runU('DELETE FROM user_roles WHERE user_id = :uid');
    await runU('DELETE FROM report_comments WHERE user_id = :uid');
    await runU('DELETE FROM report_comments WHERE report_id IN (SELECT id FROM reports WHERE reporter_id = :uid OR assigned_to = :uid)');
    await runU('DELETE FROM reports WHERE reporter_id = :uid OR assigned_to = :uid');

    // 6. Desvincular sin borrar (ON DELETE SET NULL — Postgres lo haría solo,
    //    pero explícito para no depender del orden de ejecución del constraint)
    await runU('UPDATE orders SET user_id = NULL WHERE user_id = :uid');
    await runU('UPDATE user_roles SET assigned_by = NULL WHERE assigned_by = :uid');

    // borrado físico del usuario
    await sequelize.query('DELETE FROM users WHERE id = :uid', { replacements: { uid: userId } });

    // limpiamos landing_db
    try {
      const pg = require('pg');
      const landingPool = new pg.Pool({
        host: process.env.LANDING_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.LANDING_DB_PORT || '5434'),
        database: process.env.LANDING_DB_NAME || 'landing_db',
        user: process.env.LANDING_DB_USER || 'landing',
        password: process.env.LANDING_DB_PASSWORD,
        max: 2
      });
      await landingPool.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [userEmail]);
      await landingPool.query('DELETE FROM users WHERE email = $1', [userEmail]);
      await landingPool.end();
    } catch (e) { console.error('Landing DB cleanup error:', e.message); }

    res.json({ success: true, message: `Usuario "${userName}" eliminado permanentemente` });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/roles', requireAdminSecret, async (req, res) => {
  try {
    const { Role } = require('../models');
    const roles = await Role.findAll({ attributes: ['id', 'name', 'display_name', 'description', 'level'] });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// endpoints de gestión de tickets (para el panel admin de la landing)
// ═══════════════════════════════════════════════

router.get('/admin/tickets', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const { status } = req.query;
    const where = { ticket_type: 'neonhub_support' };
    if (status) where.status = status;

    const tickets = await SupportTicket.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Admin list tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/tickets/:id', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

    // marcamos el ticket como leído por el admin
    await ticket.update({ read_by_admin: true, admin_last_seen: new Date() });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Admin ticket details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admin/tickets/:id/status', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

    await ticket.update({ status });

    const { emitStatusChange } = require('../services/socketService');
    emitStatusChange(req.params.id, status);

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Admin ticket status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/tickets/:id/reply', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

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

    const { emitNewReply } = require('../services/socketService');
    emitNewReply(req.params.id, newReply, ticket);

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Admin ticket reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ═══════════════════════════════════════════════
// borrar tickets
// ═══════════════════════════════════════════════

router.delete('/admin/tickets/resolved', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const result = await SupportTicket.destroy({ where: { status: 'resolved' }, force: true });
    res.json({ success: true, message: `${result} tickets resueltos eliminados` });
  } catch (error) {
    console.error('Admin delete resolved tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/admin/tickets/:id', requireAdminSecret, async (req, res) => {
  try {
    const { SupportTicket } = require('../models');
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

    await ticket.destroy({ force: true });
    res.json({ success: true, message: 'Ticket eliminado' });
  } catch (error) {
    console.error('Admin delete ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════
// Crear tienda manualmente (admin)
// ═══════════════════════════════════════════════

router.post('/admin/stores/create', requireAdminSecret, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { Store, User, Role, UserStore, UserRole } = require('../models');
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const { name, subdomain, plan_id, owner_email, owner_password, owner_first_name, owner_last_name } = req.body;

    if (!name || !subdomain || !owner_email) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'name, subdomain y owner_email son obligatorios' });
    }

    // normalizamos el subdominio
    const cleanSub = String(subdomain).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanSub || cleanSub === 'main' || cleanSub === 'demo') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Subdominio no válido o reservado' });
    }

    // comprobamos si el subdominio ya existe
    const existing = await Store.findOne({ where: { subdomain: cleanSub }, paranoid: false, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `El subdominio "${cleanSub}" ya existe` });
    }

    // creamos la tienda
    const store = await Store.create({
      name,
      subdomain: cleanSub,
      is_active: true,
      plan_id: plan_id || 'starter',
      plan_price_cents: plan_id === 'enterprise' ? 149900 : plan_id === 'installation' ? 99900 : 49900,
      billing_start_date: new Date().toISOString().split('T')[0],
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_status: 'paid',
      settings: {
        currency: 'EUR',
        language: 'es',
        plan_id: plan_id || 'starter',
        saas_onboarding_status: 'active'
      }
    }, { transaction: t });

    // creamos el schema del tenant
    const schemaName = `t_${store.id.replace(/-/g, '').toLowerCase()}`;
    const qi = sequelize.getQueryInterface();
    await qi.createSchema(schemaName, { transaction: t }).catch(() => {});
    const qs = qi.quoteIdentifier(schemaName);
    await sequelize.query(`CREATE TABLE IF NOT EXISTS ${qs}.products (id uuid PRIMARY KEY, name varchar(150) NOT NULL, sku varchar(80) UNIQUE, price numeric(12,2) NOT NULL DEFAULT 0, stock_quantity integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`, { transaction: t });
    await sequelize.query(`CREATE TABLE IF NOT EXISTS ${qs}.customers (id uuid PRIMARY KEY, email varchar(120) UNIQUE, first_name varchar(80), last_name varchar(80), phone varchar(30), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`, { transaction: t });
    await sequelize.query(`CREATE TABLE IF NOT EXISTS ${qs}.orders (id uuid PRIMARY KEY, order_number varchar(40) UNIQUE NOT NULL, customer_id uuid, status varchar(40) NOT NULL DEFAULT 'pending', total_amount numeric(12,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`, { transaction: t });

    // actualizamos la configuración de la tienda con el nombre del schema
    await store.update({ settings: { ...store.settings, schema_name: schemaName } }, { transaction: t });

    // creamos el usuario propietario
    const rawPassword = owner_password || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const mustSetPassword = !owner_password;

    let ownerUser = await User.findOne({ where: { email: owner_email }, paranoid: false, transaction: t });
    const wasExistingUser = !!ownerUser;
    if (ownerUser) {
      // MODELO B: el usuario ya existe (misma identidad/contraseña). NO tocamos su
      // contraseña. Solo lo reactivamos y fijamos su tienda principal si no tenía.
      const updates = { is_active: true, deleted_at: null };
      if (!ownerUser.store_id) updates.store_id = store.id;
      await ownerUser.update(updates, { transaction: t });
    } else {
      ownerUser = await User.create({
        store_id: store.id,
        username: `${cleanSub}_admin`,
        email: owner_email,
        password_hash: passwordHash,
        first_name: owner_first_name || 'Owner',
        last_name: owner_last_name || name,
        is_active: true,
        email_verified: true,
        preferences: { theme: 'dark', language: 'es', plan_id: plan_id || 'starter', onboarding_status: 'provisioned', must_set_password: mustSetPassword }
      }, { transaction: t });
    }

    // registramos la tienda en user_stores (idempotente)
    await UserStore.findOrCreate({
      where: { user_id: ownerUser.id, store_id: store.id },
      defaults: { is_primary: !ownerUser.store_id || ownerUser.store_id === store.id },
      transaction: t
    });

    // asignamos el rol CEO
    const [ceoRole] = await Role.findOrCreate({
      where: { name: 'ceo' },
      defaults: { name: 'ceo', display_name: 'CEO', level: 9, is_system: true, description: 'CEO role' },
      transaction: t
    });
    // MODELO B: el rol es POR TIENDA. Creamos la fila user_roles directamente con
    // store_id (no usamos addRole, que trata (user_id, role_id) como única y no
    // permitiría el mismo rol en otra tienda).
    await UserRole.findOrCreate({
      where: { user_id: ownerUser.id, role_id: ceoRole.id, store_id: store.id },
      defaults: { user_id: ownerUser.id, role_id: ceoRole.id, store_id: store.id, is_active: true, assigned_at: new Date() },
      transaction: t
    });

    await t.commit();

    // MODELO B: si el usuario ya existía, conserva su contraseña actual. No anunciamos
    // ninguna contraseña nueva (antes se enviaba una que nunca se aplicaba → confusión).
    const passwordWasSet = !wasExistingUser && mustSetPassword;
    const credentialsNote = wasExistingUser
      ? 'Cuenta existente: se usa la contraseña actual del usuario.'
      : (mustSetPassword ? 'Cuenta nueva: el usuario debe establecer su contraseña.' : '(contraseña elegida por admin)');

    // Notify n8n for welcome email
    try {
      const axios = require('axios');
      const n8nUrl = process.env.N8N_STORE_CREATED_WEBHOOK_URL || 'https://neonhub.n8nservidor.es/webhook/store-created';
      await axios.post(n8nUrl, {
        event: 'store_created_manual',
        store_name: name,
        subdomain: cleanSub,
        owner_email,
        owner_name: owner_first_name || 'Owner',
        existing_user: wasExistingUser,
        password: passwordWasSet ? rawPassword : credentialsNote,
        must_set_password: passwordWasSet,
        store_url: `https://${cleanSub}.neonhub.es`,
        admin_url: `https://${cleanSub}.neonhub.es/admin`
      });
    } catch (e) { console.error('n8n webhook error:', e.message); }

    res.json({
      success: true,
      message: `Tienda "${name}" creada correctamente en ${cleanSub}.neonhub.es`,
      data: {
        store: { id: store.id, name, subdomain: cleanSub, plan_id: plan_id || 'starter' },
        owner: { email: owner_email, username: ownerUser.username, existing_user: wasExistingUser, must_set_password: passwordWasSet },
        password: passwordWasSet ? rawPassword : null
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Admin create store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Demo reset endpoint — called by n8n every hour
// ---------------------------------------------------------------------------

const requireDemoResetToken = (req, res, next) => {
  const token = req.headers['x-reset-token'];
  const expected = process.env.DEMO_RESET_TOKEN;
  if (!expected) {
    return res.status(500).json({ success: false, message: 'DEMO_RESET_TOKEN no configurado en el servidor' });
  }
  if (!token || token !== expected) {
    return res.status(401).json({ success: false, message: 'Token de reset inválido' });
  }
  next();
};

const DEMO_STORE_ID = '75cf2d3d-f22e-4ac1-805f-5da02e9c70b0';
const DEMO_SNAPSHOT_PATH = require('path').join(__dirname, '../data/demo_seed_snapshot.json');

// Constantes de seed — idénticas a demoTenantService.js para estado consistente
const DEMO_EXTRA_CUSTS = [
  { id: 'c0000001-0000-4000-8000-000000000001', code: 'C011', fn: 'Ana',     ln: 'Martínez Ruiz',    email: 'ana.martinez@ejemplo.es',     phone: '+34 611 111 001', city: 'Barcelona',  cp: '08001' },
  { id: 'c0000002-0000-4000-8000-000000000002', code: 'C012', fn: 'Carlos',  ln: 'López Fernández',  email: 'carlos.lopez@ejemplo.es',     phone: '+34 622 222 002', city: 'Madrid',     cp: '28001' },
  { id: 'c0000003-0000-4000-8000-000000000003', code: 'C013', fn: 'Isabel',  ln: 'González Sánchez', email: 'isabel.gonzalez@ejemplo.es',  phone: '+34 633 333 003', city: 'Valencia',   cp: '46001' },
  { id: 'c0000004-0000-4000-8000-000000000004', code: 'C014', fn: 'Javier',  ln: 'Rodríguez Pérez',  email: 'javier.rodriguez@ejemplo.es', phone: '+34 644 444 004', city: 'Sevilla',    cp: '41001' },
  { id: 'c0000005-0000-4000-8000-000000000005', code: 'C015', fn: 'Laura',   ln: 'Hernández García', email: 'laura.hernandez@ejemplo.es',  phone: '+34 655 555 005', city: 'Zaragoza',   cp: '50001' },
  { id: 'c0000006-0000-4000-8000-000000000006', code: 'C016', fn: 'Miguel',  ln: 'Díaz Moreno',      email: 'miguel.diaz@ejemplo.es',      phone: '+34 666 666 006', city: 'Málaga',     cp: '29001' },
  { id: 'c0000007-0000-4000-8000-000000000007', code: 'C017', fn: 'Sofía',   ln: 'Álvarez Jiménez',  email: 'sofia.alvarez@ejemplo.es',    phone: '+34 677 777 007', city: 'Murcia',     cp: '30001' },
  { id: 'c0000008-0000-4000-8000-000000000008', code: 'C018', fn: 'Pablo',   ln: 'Romero Gutiérrez', email: 'pablo.romero@ejemplo.es',     phone: '+34 688 888 008', city: 'Palma',      cp: '07001' },
  { id: 'c0000009-0000-4000-8000-000000000009', code: 'C019', fn: 'Elena',   ln: 'Torres Navarro',   email: 'elena.torres@ejemplo.es',     phone: '+34 699 999 009', city: 'Las Palmas', cp: '35001' },
  { id: 'c000000a-0000-4000-8000-00000000000a', code: 'C020', fn: 'Roberto', ln: 'Vega Castillo',    email: 'roberto.vega@ejemplo.es',     phone: '+34 600 000 010', city: 'Bilbao',     cp: '48001' },
];
const DEMO_EP = [
  ['05d7ec58-b696-4ed9-9a0c-9e04660f3ceb', 1199.00],
  ['9f9308c8-1a23-4502-86f9-02387f6e7f61',  349.00],
  ['8685b9ad-5487-4d59-9a12-199b2bd24a68',  339.00],
  ['2f043d6f-76fd-46ff-ac35-28ffd6380971',  279.00],
  ['f57db08f-5a60-4c54-aedf-ce6f3077e7df',  149.00],
  ['9a4e02b4-12d0-422c-9cf2-d2378607113f',  129.00],
  ['8947581e-2996-42b8-9320-33b7b35b8e06',   89.00],
  ['cfbae716-d90d-4144-9958-fa301acd2372',   69.00],
  ['12a43e94-6a6d-4352-8693-55ce4452edc7',   59.00],
  ['28bf6e0a-d5ef-4f21-be0f-77de72bba4cf',   49.00],
];
const demoOrderStatus = i => i < 5 ? 'cancelled' : i < 15 ? 'processing' : i < 25 ? 'shipped' : 'completed';
const demoPayStatus   = s => s === 'cancelled' ? 'refunded' : s === 'processing' ? 'pending_payment' : 'paid';
const demoDaysAgo     = i => i < 5 ? [78,61,43,28,13][i] : i < 15 ? Math.round(8-((i-5)/9)*7) : i < 25 ? Math.round(22-((i-15)/9)*16) : Math.round(89-((i-25)/39)*74);
const DEMO_SEED_DISCOUNTS = [
  { id: 'dc000001-0000-4000-8000-000000000001', code: 'BIENVENIDO10', type: 'percentage', value: 10.00, desc: 'Descuento de bienvenida 10%', min: 0,  maxUses: '100',  used: 23 },
  { id: 'dc000002-0000-4000-8000-000000000002', code: 'VERANO20',     type: 'percentage', value: 20.00, desc: 'Oferta de verano 20%',         min: 30, maxUses: '50',   used: 7  },
  { id: 'dc000003-0000-4000-8000-000000000003', code: 'FIJO5',        type: 'fixed',      value: 5.00,  desc: 'Descuento fijo 5€',            min: 50, maxUses: 'NULL', used: 15 },
];
const DEMO_SEED_TICKETS = [
  { id: 'bc000001-0000-4000-8000-000000000001', email: 'carlos.lopez@ejemplo.es',    subject: '¿Cuándo llega mi pedido DX-0018?',        message: 'Hola, realicé el pedido hace 3 días y todavía no tengo información de envío. ¿Podéis ayudarme?',          status: 'open',        priority: 'normal', responses: '[]',                                                                                                                                                                                                                                                        rbc: true,  rba: false, days: 2  },
  { id: 'bc000002-0000-4000-8000-000000000002', email: 'laura.hernandez@ejemplo.es', subject: 'Producto llegó dañado',                   message: 'El Nintendo Switch llegó con la pantalla rayada. Necesito una devolución o reemplazo urgente.',              status: 'in_progress', priority: 'high',   responses: JSON.stringify([{ author: 'admin', message: 'Lamentamos el inconveniente. Hemos iniciado el proceso de devolución y recibirás el reemplazo en 3-5 días hábiles.',                             created_at: new Date(Date.now()-86400000).toISOString() }]),   rbc: false, rba: true,  days: 5  },
  { id: 'bc000003-0000-4000-8000-000000000003', email: 'ana.martinez@ejemplo.es',    subject: 'Consulta sobre descuentos para empresas', message: '¿Ofrecéis descuentos para compras de más de 10 unidades? Somos una empresa y nos interesa el volumen.',      status: 'resolved',    priority: 'low',    responses: JSON.stringify([{ author: 'admin', message: 'Hola Ana, sí disponemos de precios especiales para empresas. Usa el código VERANO20 por ahora y contáctanos para un presupuesto personalizado.', created_at: new Date(Date.now()-7*86400000).toISOString() }]), rbc: true,  rba: true,  days: 10 },
  { id: 'bc000004-0000-4000-8000-000000000004', email: 'miguel.diaz@ejemplo.es',     subject: 'No puedo iniciar sesión en mi cuenta',    message: 'Intenté cambiar mi contraseña pero el enlace de recuperación no funciona. Llevo dos días sin acceso.',       status: 'open',        priority: 'urgent', responses: '[]',                                                                                                                                                                                                                                                        rbc: true,  rba: false, days: 1  },
  { id: 'bc000005-0000-4000-8000-000000000005', email: 'pablo.romero@ejemplo.es',    subject: 'Factura incorrecta en pedido DX-0033',    message: 'La factura tiene una dirección fiscal incorrecta. Necesito que la modifiquen para la deducción fiscal.',      status: 'in_progress', priority: 'normal', responses: JSON.stringify([{ author: 'admin', message: 'Hemos recibido tu solicitud. En breve te enviaremos la factura rectificativa por email.',                                                          created_at: new Date(Date.now()-86400000).toISOString() }]),   rbc: true,  rba: true,  days: 3  },
];

router.post('/admin/demo/reset', requireDemoResetToken, async (req, res) => {
  // cargamos el snapshot — identifica los registros semilla por UUID
  let snap;
  try {
    snap = JSON.parse(require('fs').readFileSync(DEMO_SNAPSHOT_PATH, 'utf8'));
  } catch (_e) {
    return res.status(500).json({ success: false, message: 'demo_seed_snapshot.json not found — run demo-store-seed.js first' });
  }

  const seedCatIds   = snap.categories.map(r => r.id);
  const seedProdIds  = snap.products.map(r => r.id);
  const seedCustIds  = snap.customers.map(r => r.id);
  const seedOrderIds = snap.orders.map(r => r.id);
  const idList = ids => ids.map(id => `'${id}'`).join(',');

  const t = await sequelize.transaction();
  try {
    const [stores] = await sequelize.query(
      'SELECT id FROM stores WHERE id = :sid',
      { replacements: { sid: DEMO_STORE_ID }, transaction: t }
    );
    if (stores.length === 0) {
      await t.rollback();
      return res.status(500).json({ success: false, message: `Demo store ${DEMO_STORE_ID} no encontrada` });
    }

    const run = (q, r) => sequelize.query(q, { replacements: r, transaction: t });
    const runRaw = (q) => sequelize.query(q, { transaction: t });

    // 1. Delete non-seed order_items, invoices, transactions
    await runRaw(`
      DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${idList(seedOrderIds)})
      )`);
    await runRaw(`
      DELETE FROM invoice_items WHERE invoice_id IN (
        SELECT id FROM invoices WHERE order_id IN (
          SELECT id FROM orders WHERE store_id = '${DEMO_STORE_ID}'
          AND id NOT IN (${idList(seedOrderIds)})
        ))`);
    await runRaw(`
      DELETE FROM invoices WHERE order_id IN (
        SELECT id FROM orders WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${idList(seedOrderIds)})
      )`);
    await runRaw(`
      DELETE FROM transactions WHERE order_id IN (
        SELECT id FROM orders WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${idList(seedOrderIds)})
      )`);

    // 2. Delete non-seed orders
    const [delOrders] = await runRaw(`
      DELETE FROM orders WHERE store_id = '${DEMO_STORE_ID}'
      AND id NOT IN (${idList(seedOrderIds)}) RETURNING id`);
    const ordersDeleted = Array.isArray(delOrders) ? delOrders.length : 0;

    // 3. Delete non-seed customers
    const [delCusts] = await runRaw(`
      DELETE FROM customers WHERE store_id = '${DEMO_STORE_ID}'
      AND id NOT IN (${idList(seedCustIds)}) RETURNING id`);
    const customersDeleted = Array.isArray(delCusts) ? delCusts.length : 0;

    // 4. Delete non-seed products
    const [delProds] = await runRaw(`
      DELETE FROM products WHERE store_id = '${DEMO_STORE_ID}'
      AND id NOT IN (${idList(seedProdIds)}) RETURNING id`);
    const productsDeleted = Array.isArray(delProds) ? delProds.length : 0;

    // 5. Delete non-seed categories
    const [delCats] = await runRaw(`
      DELETE FROM categories WHERE store_id = '${DEMO_STORE_ID}'
      AND id NOT IN (${idList(seedCatIds)}) RETURNING id`);
    const categoriesDeleted = Array.isArray(delCats) ? delCats.length : 0;

    // 6. restauramos los productos semilla con sus valores originales
    for (const p of snap.products) {
      await sequelize.query(
        `UPDATE products SET name = $1, slug = $2, price = $3, cost_price = $4, compare_price = $5,
           stock_quantity = $6, description = $7, is_active = true, deleted_at = NULL, updated_at = NOW()
         WHERE id = $8 AND store_id = '${DEMO_STORE_ID}'`,
        { bind: [p.name, p.slug, p.price, p.cost_price, p.compare_price, p.stock_quantity, p.description, p.id], transaction: t }
      );
    }

    // 6b. restauramos las categorías semilla
    for (const c of snap.categories) {
      await sequelize.query(
        `UPDATE categories SET name = $1, slug = $2, color = $3, icon = $4, sort_order = $5, is_active = true, deleted_at = NULL, updated_at = NOW()
         WHERE id = $6 AND store_id = '${DEMO_STORE_ID}'`,
        { bind: [c.name, c.slug, c.color, c.icon, c.sort_order, c.id], transaction: t }
      );
    }

    // 7. restauramos los pedidos semilla
    for (const o of snap.orders) {
      await sequelize.query(
        `UPDATE orders SET status = $1, payment_status = $2, total_amount = $3, deleted_at = NULL, updated_at = NOW()
         WHERE id = $4 AND store_id = '${DEMO_STORE_ID}'`,
        { bind: [o.status, o.payment_status, o.total_amount, o.id], transaction: t }
      );
    }

    // 8. restauramos las líneas de los pedidos semilla
    await runRaw(`DELETE FROM order_items WHERE order_id IN (${idList(seedOrderIds)})`);
    for (const item of snap.order_items) {
      await sequelize.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity, line_total = EXCLUDED.line_total, updated_at = NOW()`,
        { bind: [item.id, item.order_id, item.product_id, item.quantity, item.unit_price, item.discount_rate, item.tax_rate, item.line_total], transaction: t }
      );
    }

    // 9. limpiamos datos auxiliares
    await run('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE store_id = :sid))', { sid: DEMO_STORE_ID });
    await run('DELETE FROM audit_logs WHERE store_id = :sid', { sid: DEMO_STORE_ID });
    await run('DELETE FROM discount_codes WHERE store_id = :sid', { sid: DEMO_STORE_ID });
    await run('DELETE FROM support_tickets WHERE store_id = :sid', { sid: DEMO_STORE_ID });

    // 9b. Seed 3 discount codes
    for (const d of DEMO_SEED_DISCOUNTS) {
      await sequelize.query(
        `INSERT INTO discount_codes (id, store_id, code, type, value, description, min_order_amount, max_uses, used_count, is_active, expires_at, created_at, updated_at)
         VALUES (:id,:sid,:code,:type,:value,:desc,:min,${d.maxUses},:used,true,NOW()+INTERVAL '60 days',NOW()-INTERVAL '30 days',NOW())`,
        { replacements: { id: d.id, sid: DEMO_STORE_ID, code: d.code, type: d.type, value: d.value, desc: d.desc, min: d.min, used: d.used }, transaction: t }
      );
    }

    // 9c. Seed 5 support tickets
    for (const tk of DEMO_SEED_TICKETS) {
      await sequelize.query(
        `INSERT INTO support_tickets (id, store_id, customer_email, subject, message, status, priority, ticket_type, responses, read_by_customer, read_by_admin, created_at, updated_at)
         VALUES (:id,:sid,:email,:subject,:message,:status,:priority,'store_support',:responses::jsonb,:rbc,:rba,NOW()-INTERVAL '${tk.days} days',NOW()-INTERVAL '${Math.max(0,tk.days-1)} days')`,
        { replacements: { id: tk.id, sid: DEMO_STORE_ID, email: tk.email, subject: tk.subject, message: tk.message, status: tk.status, priority: tk.priority, responses: tk.responses, rbc: tk.rbc, rba: tk.rba }, transaction: t }
      );
    }

    // 10. Refresh seed order created_at dates (distribute over last 90 days)
    const orderCount = snap.orders.length;
    for (let idx = 0; idx < orderCount; idx++) {
      const o = snap.orders[idx];
      const daysAgo = Math.floor((idx / orderCount) * 90);
      await sequelize.query(`
        UPDATE orders SET created_at = NOW() - INTERVAL '${daysAgo} days',
          order_date = NOW() - INTERVAL '${daysAgo} days', updated_at = NOW()
        WHERE id = $1 AND store_id = '${DEMO_STORE_ID}'
      `, { bind: [o.id], transaction: t });
    }

    // 11. restauramos la configuración de la tienda (con las claves que usa storeController)
    const demoSettings = JSON.stringify({
      currency: 'EUR',
      language: 'es',
      branding: {
        appName: 'Demo Sostenible',
        dashboard_name: 'Demo Sostenible',
        store_description: 'Tienda de demostración de NeonHub. Explora todas las funcionalidades de NeonHub.',
        hero_title: null,
        hero_subtitle: null,
        logo_url: null,
        favicon_url: null,
        dashboard_logo_url: null,
        dashboard_favicon_url: null,
        primary_color: '#38bdf8',
        secondary_color: '#0284c7',
        accent_color: '#7dd3fc',
        bg_color: '#020617',
      },
      design: {
        layout: 'modern',
        button_radius: 'pill',
        font: 'default',
      },
      enterprise_config: {
        features: {
          products: true, orders: true, customers: true, gallery: true,
          analytics: false, sustainability: false, reports: false,
          invoices: false, tickets: false, certifications: false, discounts: false,
        },
        design: {
          gradient_enabled: true,
          gradient_from: '#020617',
          gradient_to: '#0a1a3a',
          gradient_direction: 'to bottom right',
          announcement_enabled: false,
          announcement_text: null,
          announcement_color: null,
          custom_css: null,
        },
        sections: {},
        limits: {},
      },
    });
    await sequelize.query(
      `UPDATE stores SET settings = :settings::json, updated_at = NOW() WHERE id = :sid`,
      { replacements: { settings: demoSettings, sid: DEMO_STORE_ID }, transaction: t }
    );
    await sequelize.query(
      `UPDATE stores SET name = 'Demo Sostenible', subdomain = 'demo', updated_at = NOW() WHERE id = :sid`,
      { replacements: { sid: DEMO_STORE_ID }, transaction: t }
    );

    // 12. restauramos el perfil y las credenciales del usuario demo
    const bcrypt = require('bcryptjs');
    const demoHash = await bcrypt.hash('Demo1234!', 10);
    await sequelize.query(`
      UPDATE users SET
        username = 'demo', first_name = 'Demo', last_name = 'User',
        password_hash = :hash, is_active = true, email_verified = true,
        deleted_at = NULL, password_reset_token = NULL, password_reset_expires = NULL,
        updated_at = NOW()
      WHERE email = 'demo@neonhub.es'
    `, { replacements: { hash: demoHash }, transaction: t });

    // 13. limpiamos sesiones, notificaciones y tokens SSO del usuario demo
    await sequelize.query(`DELETE FROM user_sessions
      WHERE user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')`,
      { transaction: t });
    await sequelize.query(`DELETE FROM notifications
      WHERE user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')`,
      { transaction: t });
    await sequelize.query(`DELETE FROM sso_tokens
      WHERE user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')`,
      { transaction: t }).catch(() => {});

    // reseteamos los permisos de módulos del usuario para que aparezcan todos activos
    await sequelize.query(`
      UPDATE user_permissions SET permissions = '{}', updated_at = NOW()
      WHERE user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')
        AND store_id = :sid
    `, { replacements: { sid: DEMO_STORE_ID }, transaction: t }).catch(() => {});

    // 14. nos aseguramos de que el usuario demo tiene el rol CEO activo en la tienda demo
    await sequelize.query(`
      INSERT INTO user_roles (id, user_id, role_id, store_id, is_active, assigned_at, created_at, updated_at)
      SELECT gen_random_uuid(),
        (SELECT id FROM users WHERE email = 'demo@neonhub.es'),
        (SELECT id FROM roles WHERE name = 'ceo' LIMIT 1),
        :sid, true, NOW(), NOW(), NOW()
      WHERE EXISTS (SELECT 1 FROM users WHERE email = 'demo@neonhub.es')
        AND EXISTS (SELECT 1 FROM roles WHERE name = 'ceo')
      ON CONFLICT (user_id, role_id, store_id) DO UPDATE SET is_active = true, updated_at = NOW()
    `, { replacements: { sid: DEMO_STORE_ID }, transaction: t });

    // 15. nos aseguramos de que existe el enlace user_stores para el usuario demo
    await sequelize.query(`
      INSERT INTO user_stores (user_id, store_id)
      SELECT (SELECT id FROM users WHERE email = 'demo@neonhub.es'), :sid
      WHERE EXISTS (SELECT 1 FROM users WHERE email = 'demo@neonhub.es')
      ON CONFLICT (user_id, store_id) DO NOTHING
    `, { replacements: { sid: DEMO_STORE_ID }, transaction: t });

    // 16. Insertar 10 clientes extra (UUIDs fijos c0000001-c000000a)
    for (const c of DEMO_EXTRA_CUSTS) {
      const addr = JSON.stringify({ street: '', city: c.city, state: '', postal_code: c.cp, country: 'ES' });
      await sequelize.query(
        `INSERT INTO customers (id, store_id, customer_code, first_name, last_name, email, phone,
           billing_address, shipping_address, customer_type, is_active, credit_limit, payment_terms, discount_rate, created_at, updated_at)
         VALUES (:id,:sid,:code,:fn,:ln,:email,:phone,:addr::json,:addr::json,'individual',true,0,30,0,NOW()-INTERVAL '60 days',NOW())
         ON CONFLICT (id) DO UPDATE SET updated_at=NOW()`,
        { replacements: { id: c.id, sid: DEMO_STORE_ID, code: c.code, fn: c.fn, ln: c.ln, email: c.email, phone: c.phone, addr }, transaction: t }
      );
    }

    // 17. Insertar 65 pedidos extra DX-0001..DX-0065 + order_items
    for (let i = 0; i < 65; i++) {
      const h      = (i + 1).toString(16).padStart(8, '0');
      const ordId  = `${h}-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
      const itmId  = `${h}-0001-4000-8000-${String(i+1).padStart(12,'0')}`;
      const custId = DEMO_EXTRA_CUSTS[i % DEMO_EXTRA_CUSTS.length].id;
      const [prodId, prodPrice] = DEMO_EP[i % DEMO_EP.length];
      const qty      = (i % 3 === 0) ? 2 : 1;
      const subtotal = Math.round(prodPrice * qty * 100) / 100;
      const tax      = Math.round(subtotal * 0.21 * 100) / 100;
      const total    = Math.round((subtotal + tax) * 100) / 100;
      const status   = demoOrderStatus(i);
      const days     = demoDaysAgo(i);
      const num      = `DX-${String(i + 1).padStart(4, '0')}`;

      await sequelize.query(
        `INSERT INTO orders (id, store_id, order_number, customer_id, status, order_date,
           subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
           currency, payment_status, payment_method, created_at, updated_at)
         VALUES (:id,:sid,:num,:cid,:status,NOW()-INTERVAL '${days} days',
           :sub,:tax,0,0,:total,'EUR',:pay,'stripe',NOW()-INTERVAL '${days} days',NOW())
         ON CONFLICT (order_number) DO UPDATE SET status=EXCLUDED.status, total_amount=EXCLUDED.total_amount, updated_at=NOW()`,
        { replacements: { id: ordId, sid: DEMO_STORE_ID, num, cid: custId, status, sub: subtotal, tax, total, pay: demoPayStatus(status) }, transaction: t }
      );

      await sequelize.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
         VALUES (:id,:oid,:pid,:qty,:price,0,0.21,:line,NOW()-INTERVAL '${days} days',NOW())
         ON CONFLICT (id) DO UPDATE SET quantity=EXCLUDED.quantity, line_total=EXCLUDED.line_total, updated_at=NOW()`,
        { replacements: { id: itmId, oid: ordId, pid: prodId, qty, price: prodPrice, line: total }, transaction: t }
      );
    }

    await t.commit();

    const summary = { orders_deleted: ordersDeleted, customers_deleted: customersDeleted, products_deleted: productsDeleted, categories_deleted: categoriesDeleted, stock_restored: snap.products.length, orders_restored: snap.orders.length, extra_customers: 10, extra_orders: 65, discounts: 3, tickets: 5 };
    console.log(`[demo-reset] OK at ${new Date().toISOString()} —`, JSON.stringify(summary));
    res.json({ success: true, reset_at: new Date().toISOString(), summary });
  } catch (error) {
    await t.rollback().catch(() => {});
    console.error('[demo-reset] ERROR:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /admin/reset-password-user — dispara forgot-password para un usuario ─
router.post('/admin/reset-password-user', requireAdminSecret, async (req, res) => {
  try {
    const { User } = require('../models');
    const { sendPasswordResetEmail } = require('../services/emailService');
    const crypto = require('crypto');
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email es obligatorio' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado en neonhub_db' });
    if (!user.is_active) return res.status(400).json({ success: false, message: 'El usuario está inactivo' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    await user.update({
      password_reset_token: resetToken,
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000)
    });

    await sendPasswordResetEmail(user, resetToken);
    res.json({ success: true, message: `Email de restablecimiento enviado a ${email}` });
  } catch (error) {
    console.error('Admin reset-password-user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /admin/leads/create — crea usuario en landing_db ────────────────────
router.post('/admin/leads/create', requireAdminSecret, async (req, res) => {
  try {
    const { getLandingPool } = require('../config/landingDb');
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'username, email y password son obligatorios' });
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ success: false, message: 'El usuario debe tener entre 3 y 30 caracteres (letras, números y _)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'El email no tiene un formato válido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }
    if (role && role !== 'user' && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'El rol debe ser "user" o "admin"' });
    }

    const pool = getLandingPool();
    if (!pool) return res.status(503).json({ success: false, message: 'landing_db no configurada' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Este email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const finalRole = role === 'admin' ? 'admin' : 'user';

    const { rows } = await pool.query(
      'INSERT INTO users (id, username, email, password, role, created_at, email_verified) VALUES ($1, $2, $3, $4, $5, NOW(), true) RETURNING id, username, email, role, email_verified, created_at',
      [id, username, email, hashedPassword, finalRole]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Admin create lead error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /admin/leads/:id — borra lead de landing_db ────────────────────────
router.delete('/admin/leads/:id', requireAdminSecret, async (req, res) => {
  try {
    const { getLandingPool } = require('../config/landingDb');
    const pool = getLandingPool();
    if (!pool) return res.status(503).json({ success: false, message: 'landing_db no configurada' });

    const requesterEmail = req.headers['x-requester-email'];
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

    if (requesterEmail && rows[0].email === requesterEmail) {
      return res.status(403).json({ success: false, message: 'No puedes realizar esta acción sobre tu propia cuenta' });
    }

    await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ success: true, message: `Lead ${rows[0].email} eliminado` });
  } catch (error) {
    console.error('Admin delete lead error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /admin/leads — landing_db users cross-referenced with neonhub_db ──────
router.get('/admin/leads', requireAdminSecret, async (req, res) => {
  try {
    const { getLandingUsers } = require('../config/landingDb');
    const { User } = require('../models');
    const { Op } = require('sequelize');

    const landingUsers = await getLandingUsers();

    if (landingUsers.length > 0) {
      const emails = landingUsers.map(u => u.email);
      const saasUsers = await User.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['email'],
        raw: true
      });
      const saasEmails = new Set(saasUsers.map(u => u.email));

      const data = landingUsers.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username || null,
        email_verified: u.email_verified,
        created_at: u.created_at,
        has_store: saasEmails.has(u.email)
      }));

      return res.json({ success: true, data, total: data.length });
    }

    res.json({ success: true, data: [], total: 0 });
  } catch (error) {
    console.error('Admin leads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /admin/resend-verification — reenvía email de verificación ──────────
router.post('/admin/resend-verification', requireAdminSecret, async (req, res) => {
  try {
    const { getLandingUsers } = require('../config/landingDb');
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email es obligatorio' });

    const users = await getLandingUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado en landing_db' });
    if (user.email_verified) return res.status(400).json({ success: false, message: 'El email ya está verificado' });

    const webhookUrl = process.env.N8N_VERIFY_EMAIL_WEBHOOK || 'https://neonhub.n8nservidor.es/webhook/verify-email-landing';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, username: user.username || user.email, token: user.id })
    });

    res.json({ success: true, message: `Email de verificación reenviado a ${email}` });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /admin/reset-password-lead — dispara reset de contraseña para lead ───
router.post('/admin/reset-password-lead', requireAdminSecret, async (req, res) => {
  try {
    const { getLandingPool } = require('../config/landingDb');
    const crypto = require('crypto');

    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email es obligatorio' });

    const requesterEmail = req.headers['x-requester-email'];
    if (requesterEmail && email === requesterEmail) {
      return res.status(403).json({ success: false, message: 'No puedes realizar esta acción sobre tu propia cuenta' });
    }

    const pool = getLandingPool();
    if (!pool) return res.status(503).json({ success: false, message: 'landing_db no configurada' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado en landing_db' });

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600 * 1000; // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    const landingUrl = process.env.LANDING_URL || 'https://neonhub.es';
    const resetLink = `${landingUrl}/reset-password?token=${resetToken}&source=landing`;

    const nodemailer = require('nodemailer');
    const transporter = process.env.EMAIL_HOST && process.env.EMAIL_USER
      ? nodemailer.createTransport({ host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT || 587, secure: process.env.EMAIL_SECURE === 'true', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
      : { sendMail: async (o) => { console.log('📧 MOCK:', o.to, o.subject); return { messageId: 'mock' }; } };
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>',
      to: email,
      subject: 'Recuperación de contraseña — NeonHub',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#8b5cf6">Recupera tu contraseña</h2><p>Hola ${user.username},</p><p>Haz clic en el enlace para establecer una nueva contraseña:</p><div style="text-align:center;margin:30px 0"><a href="${resetLink}" style="background:#8b5cf6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">Restablecer contraseña</a></div><p>Este enlace caduca en <strong>1 hora</strong>.</p><p>Si no lo solicitaste, ignora este correo.</p><p>Saludos,<br>El equipo de NeonHub</p></div>`
    });

    res.json({ success: true, message: `Email de restablecimiento enviado a ${email}` });
  } catch (error) {
    console.error('Admin reset-password-lead error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /admin/notes — obtiene notas de admin ─────────────────────────────────
router.get('/admin/notes', requireAdminSecret, async (req, res) => {
  try {
    const { sequelize } = require('../database/connection');
    const [rows] = await sequelize.query('SELECT email, note FROM admin_notes');
    const map = {};
    rows.forEach(r => { map[r.email] = r.note || ''; });
    res.json({ success: true, data: map });
  } catch (error) {
    console.error('Admin get notes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /admin/notes/:email — guarda nota de admin ─────────────────────────
router.patch('/admin/notes/:email', requireAdminSecret, async (req, res) => {
  try {
    const { sequelize } = require('../database/connection');
    const email = decodeURIComponent(req.params.email);
    const { note } = req.body;
    await sequelize.query(
      'INSERT INTO admin_notes (email, note, updated_at) VALUES (:email, :note, NOW()) ON CONFLICT (email) DO UPDATE SET note = :note, updated_at = NOW()',
      { replacements: { email, note: note || '' } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Admin save note error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/billing/create-trial ────────────────────────────────────────────
router.post('/create-trial', requireAdminSecret, billingController.createTrial);

module.exports = router;
