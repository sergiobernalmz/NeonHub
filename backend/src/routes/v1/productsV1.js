const express = require('express');
const router = express.Router();
const { Product, Category } = require('../../models');
const { Op } = require('sequelize');

const ALLOWED_SORTS = ['created_at', 'updated_at', 'name', 'price', 'stock'];

// GET /api/v1/products
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, search, in_stock, sort = 'created_at', order = 'desc' } = req.query;
    const sortField = ALLOWED_SORTS.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(parseInt(limit) || 50, 100);
    const where = { store_id: req.storeId };

    if (category) where.category_id = category;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (in_stock === 'true') where.stock = { [Op.gt]: 0 };

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
      limit: Math.min(parseInt(limit) || 50, 100),
      offset,
      order: [[sortField, sortOrder]],
    });

    res.json({
      success: true,
      data: rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price),
        compare_at_price: p.compare_at_price ? parseFloat(p.compare_at_price) : null,
        stock: p.stock,
        sku: p.sku,
        images: p.images || [],
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: Math.min(parseInt(limit) || 50, 100),
        pages: Math.ceil(count / Math.min(parseInt(limit) || 50, 100)),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, store_id: req.storeId },
      include: [{ model: Category, as: 'category', required: false }],
    });
    if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
        stock: product.stock,
        sku: product.sku,
        images: product.images || [],
        category: product.category ? { id: product.category.id, name: product.category.name } : null,
        created_at: product.created_at,
        updated_at: product.updated_at,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/products
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock, sku, images, category_id, compare_at_price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: name, price' });
    }

    if (sku) {
      const existing = await Product.findOne({ where: { sku, store_id: req.storeId } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Ya existe un producto con ese SKU', existing_id: existing.id });
      }
    }

    const product = await Product.create({
      store_id: req.storeId,
      name,
      description: description || null,
      price,
      compare_at_price: compare_at_price || null,
      stock: stock ?? 0,
      sku: sku || null,
      images: images || [],
      category_id: category_id || null,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/products/:id
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, store_id: req.storeId } });
    if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    const ALLOWED = ['name', 'description', 'price', 'compare_at_price', 'stock', 'images', 'category_id', 'sku'];
    const updates = {};
    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await product.update(updates);
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/products/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, store_id: req.storeId } });
    if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    await product.destroy();
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
