const express = require('express');
const router = express.Router();
const { Customer, Order } = require('../../models');
const { Op } = require('sequelize');

// GET /api/v1/customers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const lim = Math.min(parseInt(limit) || 50, 100);
    const offset = (Math.max(1, parseInt(page)) - 1) * lim;
    const where = { store_id: req.storeId };

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: lim,
      offset,
      order: [['created_at', 'DESC']],
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

// GET /api/v1/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, store_id: req.storeId },
      include: [{ model: Order, as: 'orders', attributes: ['id', 'status', 'total_amount', 'created_at'], required: false }],
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
