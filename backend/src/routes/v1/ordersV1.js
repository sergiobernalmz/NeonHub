const express = require('express');
const router = express.Router();
const { Order, OrderItem, Customer, Product, sequelize } = require('../../models');
const { Op } = require('sequelize');

const VALID_STATUSES = ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'completed'];

// GET /api/v1/orders/stats — must be before /:id
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { store_id: req.storeId };
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const orders = await Order.findAll({ where, attributes: ['status', 'payment_status', 'total_amount'] });
    const paidTotal = orders
      .filter(o => ['paid', 'succeeded'].includes(o.payment_status))
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const byStatus = {};
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        total_orders: orders.length,
        total_revenue: parseFloat(paidTotal.toFixed(2)),
        average_order_value: orders.length > 0 ? parseFloat((paidTotal / orders.length).toFixed(2)) : 0,
        by_status: byStatus,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, from, to, sort = 'created_at', order = 'desc' } = req.query;
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const lim = Math.min(parseInt(limit) || 50, 100);
    const offset = (Math.max(1, parseInt(page)) - 1) * lim;
    const where = { store_id: req.storeId };

    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items', required: false },
        { model: Customer, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'], required: false },
      ],
      limit: lim,
      offset,
      order: [['created_at', sortOrder]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: lim, pages: Math.ceil(count / lim) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, store_id: req.storeId },
      include: [
        { model: OrderItem, as: 'items', required: false },
        { model: Customer, as: 'customer', required: false },
      ],
    });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/orders
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customer_email, customer_name, items, total_amount, shipping_amount,
            tax_amount, external_id, source_platform, payment_method, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Se requiere al menos un item' });
    }

    if (external_id) {
      const dupe = await Order.findOne({ where: { store_id: req.storeId, external_id }, transaction: t });
      if (dupe) {
        await t.rollback();
        return res.status(409).json({ success: false, error: 'Ya existe un pedido con ese external_id', existing_id: dupe.id });
      }
    }

    let customer = null;
    if (customer_email) {
      [customer] = await Customer.findOrCreate({
        where: { email: customer_email, store_id: req.storeId },
        defaults: { first_name: customer_name || customer_email, store_id: req.storeId },
        transaction: t,
      });
    }

    const computedTotal = items.reduce((s, i) => s + (parseFloat(i.unit_price || i.price || 0) * parseInt(i.quantity || 1)), 0);

    const order = await Order.create({
      store_id: req.storeId,
      customer_id: customer?.id || null,
      status: 'confirmed',
      payment_status: 'paid',
      total_amount: total_amount ?? parseFloat(computedTotal.toFixed(2)),
      shipping_amount: shipping_amount ?? 0,
      tax_amount: tax_amount ?? 0,
      external_id: external_id || null,
      source_platform: source_platform || 'api',
      payment_method: payment_method || null,
      notes: notes || null,
    }, { transaction: t });

    for (const item of items) {
      let product = null;
      if (item.product_id) {
        product = await Product.findOne({ where: { id: item.product_id, store_id: req.storeId }, transaction: t });
      } else if (item.sku) {
        product = await Product.findOne({ where: { sku: item.sku, store_id: req.storeId }, transaction: t });
      }

      const unitPrice = parseFloat(item.unit_price || item.price || (product ? product.price : 0));
      const qty = parseInt(item.quantity || 1);

      await OrderItem.create({
        order_id: order.id,
        product_id: product?.id || null,
        product_name: item.name || (product?.name) || item.sku || 'Producto',
        sku: item.sku || product?.sku || null,
        quantity: qty,
        unit_price: unitPrice,
        total_price: parseFloat((unitPrice * qty).toFixed(2)),
      }, { transaction: t });

      if (product?.track_inventory) {
        await product.decrement('stock', { by: qty, transaction: t });
      }
    }

    await t.commit();
    res.status(201).json({ success: true, data: { id: order.id, order_number: order.order_number } });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
    }
    const order = await Order.findOne({ where: { id: req.params.id, store_id: req.storeId } });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    await order.update({ status });
    res.json({ success: true, data: { id: order.id, status: order.status } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
