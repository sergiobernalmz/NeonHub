const { Order, Customer, Return, OrderItem, Product } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const stripeService = require('../services/stripeService');

exports.createReturn = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const { order_id, reason, description, refund_type } = req.body;
    if (!order_id || !reason) {
      return res.status(400).json({ success: false, message: 'order_id y reason son obligatorios' });
    }

    const order = await Order.findOne({
      where: { id: order_id, store_id: storeId },
      include: [{ model: Customer, as: 'customer' }]
    });

    if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

    if (order.customer.email !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!['delivered', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden devolver pedidos entregados o completados'
      });
    }

    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(order.updatedAt)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDelivery > 30) {
      return res.status(400).json({
        success: false,
        message: 'El plazo de devolución de 30 días ha expirado'
      });
    }

    const existingReturn = await Return.findOne({
      where: { order_id, status: { [Op.in]: ['pending', 'approved'] } }
    });
    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud de devolución para este pedido'
      });
    }

    const returnRequest = await Return.create({
      order_id,
      customer_id: order.customer_id,
      store_id: storeId,
      reason,
      description,
      refund_type: refund_type || 'refund',
      refund_amount: order.total_amount
    });

    return res.status(201).json({ success: true, data: returnRequest });
  } catch (error) {
    console.error('Error creating return:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyReturns = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const customer = await Customer.findOne({
      where: { email: req.user.email, store_id: storeId }
    });

    if (!customer) return res.json({ success: true, data: [] });

    const returns = await Return.findAll({
      where: { customer_id: customer.id },
      include: [{
        model: Order,
        as: 'order',
        attributes: ['order_number', 'total_amount']
      }],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, data: returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CEO endpoints ────────────────────────────────────────────────────────────

exports.getStoreReturns = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const { status, page = 1, limit = 20 } = req.query;
    const where = { store_id: storeId };
    if (status) where.status = status;

    const returns = await Return.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['first_name', 'last_name', 'email'] },
        { model: Order, as: 'order', attributes: ['order_number', 'total_amount', 'stripe_payment_intent_id'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    return res.json({ success: true, data: returns.rows, total: returns.count });
  } catch (error) {
    console.error('Error fetching store returns:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReturnStats = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const where = { store_id: storeId };

    const [total, pending, approved, rejected, refunded, totalRefunded] = await Promise.all([
      Return.count({ where }),
      Return.count({ where: { ...where, status: 'pending' } }),
      Return.count({ where: { ...where, status: 'approved' } }),
      Return.count({ where: { ...where, status: 'rejected' } }),
      Return.count({ where: { ...where, status: 'refunded' } }),
      Return.sum('refund_amount', { where: { ...where, status: 'refunded' } })
    ]);

    return res.json({
      success: true,
      data: { total, pending, approved, rejected, refunded, totalRefunded: totalRefunded || 0 }
    });
  } catch (error) {
    console.error('Error fetching return stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveReturn = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const { admin_comment } = req.body;

    const returnReq = await Return.findOne({
      where: { id: req.params.id, store_id: storeId },
      include: [{ model: Order, as: 'order' }]
    });

    if (!returnReq) return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
    if (returnReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Solo se pueden aprobar devoluciones pendientes' });
    }

    let stripeRefundId = null;
    if (returnReq.order?.stripe_payment_intent_id) {
      try {
        const refund = await stripeService.refundPayment(
          returnReq.order.stripe_payment_intent_id,
          returnReq.refund_amount
        );
        stripeRefundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError.message);
        return res.status(400).json({ success: false, message: `Error al procesar el reembolso: ${stripeError.message}` });
      }
    }

    await returnReq.update({ status: 'refunded', admin_comment, stripe_refund_id: stripeRefundId });

    await Order.update(
      { status: 'refunded', payment_status: 'refunded' },
      { where: { id: returnReq.order_id } }
    );

    const orderItems = await OrderItem.findAll({ where: { order_id: returnReq.order_id } });
    for (const item of orderItems) {
      await Product.increment('stock', { by: item.quantity, where: { id: item.product_id } });
    }

    const customer = await Customer.findByPk(returnReq.customer_id);
    if (customer?.email && process.env.N8N_RETURN_APPROVED_WEBHOOK) {
      axios.post(process.env.N8N_RETURN_APPROVED_WEBHOOK, {
        customer_email: customer.email,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        order_number: returnReq.order?.order_number,
        refund_amount: returnReq.refund_amount,
        store_name: req.tenant.name,
        store_subdomain: req.tenant.subdomain
      }).catch(err => console.error('n8n return-approved error:', err.message));
    }

    return res.json({ success: true, data: returnReq });
  } catch (error) {
    console.error('Error approving return:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectReturn = async (req, res) => {
  try {
    const storeId = req.tenant?.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const { admin_comment } = req.body;
    if (!admin_comment) {
      return res.status(400).json({ success: false, message: 'El motivo de rechazo es obligatorio' });
    }

    const returnReq = await Return.findOne({
      where: { id: req.params.id, store_id: storeId },
      include: [{ model: Order, as: 'order' }]
    });

    if (!returnReq || returnReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Devolución no válida para rechazar' });
    }

    await returnReq.update({ status: 'rejected', admin_comment });

    const customer = await Customer.findByPk(returnReq.customer_id);
    if (customer?.email && process.env.N8N_RETURN_REJECTED_WEBHOOK) {
      axios.post(process.env.N8N_RETURN_REJECTED_WEBHOOK, {
        customer_email: customer.email,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        order_number: returnReq.order?.order_number,
        admin_comment,
        store_name: req.tenant.name
      }).catch(err => console.error('n8n return-rejected error:', err.message));
    }

    return res.json({ success: true, data: returnReq });
  } catch (error) {
    console.error('Error rejecting return:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
