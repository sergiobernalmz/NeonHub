const { Category, Store } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// obtenemos el store_id del contexto del tenant o del usuario autenticado
const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

// convertimos el nombre en un slug válido para la URL
const slugify = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const categoryController = {
  // ──────────────────────────────────────────────
  // GET /api/categories  (public, optionalAuth)
  // ──────────────────────────────────────────────
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        is_active = true
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const storeId = resolveStoreId(req);
      const likeOperator =
        Category.sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

      if (storeId) {
        // mostramos las categorías de esta tienda y las globales (sin store_id)
        whereClause[Op.or] = [
          { store_id: storeId },
          { store_id: null }
        ];
      } else {
        // sin contexto de tenant/usuario → solo categorías globales
        whereClause.store_id = null;
      }

      if (search) {
        whereClause[Op.and] = [
          ...(whereClause[Op.and] || []),
          {
            [Op.or]: [
              { name: { [likeOperator]: `%${search}%` } },
              { description: { [likeOperator]: `%${search}%` } }
            ]
          }
        ];
      }

      if (is_active !== undefined) {
        whereClause.is_active = is_active === 'true' || is_active === true;
      }

      const { count, rows: categories } = await Category.findAndCountAll({
        where: whereClause,
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
        limit: parseInt(limit),
        offset,
        attributes: ['id', 'name', 'slug', 'description', 'color', 'icon', 'is_active', 'sort_order', 'store_id']
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          categories,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías'
      });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/categories  (requires auth)
  // ──────────────────────────────────────────────
  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const storeId = resolveStoreId(req);
      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: 'No se pudo determinar la tienda. Asegúrate de estar autenticado.'
        });
      }

      // comprobamos los límites del plan
      const store = await Store.findByPk(storeId);
      if (store && store.settings && store.settings.limits) {
        const { max_categories } = store.settings.limits;
        if (max_categories && max_categories !== -1) {
          const count = await Category.count({ where: { store_id: storeId } });
          if (count >= max_categories) {
            return res.status(403).json({
              success: false,
              message: `Límite de categorías excedido (${max_categories}). Actualiza tu plan para añadir más.`
            });
          }
        }
      }

      const { name, description, color, icon, sort_order, is_active } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
      }

      const baseSlug = slugify(name.trim());

      // nos aseguramos de que el slug sea único dentro de esta tienda
      let slug = baseSlug;
      let suffix = 1;
      while (
        await Category.findOne({ where: { slug, store_id: storeId }, paranoid: false })
      ) {
        slug = `${ baseSlug } - ${ suffix++} `;
      }

      const category = await Category.create({
        store_id: storeId,
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        color: color || '#6366f1',
        icon: icon || null,
        sort_order: sort_order ?? 0,
        is_active: is_active !== undefined ? is_active : true
      });

      res.status(201).json({
        success: true,
        message: 'Categoría creada correctamente',
        data: { category }
      });
    } catch (error) {
      console.error('Create category error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre en tu tienda.'
        });
      }
      res.status(500).json({ success: false, message: 'Error al crear la categoría' });
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/categories/:id  (requires auth)
  // ──────────────────────────────────────────────
  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const storeId = resolveStoreId(req);
      if (!storeId) {
        return res.status(403).json({ success: false, message: 'No autenticado.' });
      }

      const category = await Category.findOne({
        where: { id: req.params.id, store_id: storeId }
      });

      if (!category) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
      }

      const { name, description, color, icon, sort_order, is_active } = req.body;
      const updates = {};

      if (name) {
        updates.name = name.trim();
        const baseSlug = slugify(name.trim());
        let slug = baseSlug;
        let suffix = 1;
        while (
          await Category.findOne({
            where: { slug, store_id: storeId, id: { [Op.ne]: category.id } },
            paranoid: false
          })
        ) {
          slug = `${ baseSlug } -${ suffix++ } `;
        }
        updates.slug = slug;
      }
      if (description !== undefined) updates.description = description?.trim() || null;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      if (sort_order !== undefined) updates.sort_order = sort_order;
      if (is_active !== undefined) updates.is_active = is_active;

      await category.update(updates);

      res.json({
        success: true,
        message: 'Categoría actualizada correctamente',
        data: { category }
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar la categoría' });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE /api/categories/:id  (requires auth)
  // ──────────────────────────────────────────────
  remove: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      if (!storeId) {
        return res.status(403).json({ success: false, message: 'No autenticado.' });
      }

      const category = await Category.findOne({
        where: { id: req.params.id, store_id: storeId }
      });

      if (!category) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
      }

      await category.destroy(); // borrado suave (paranoid: true)

      res.json({ success: true, message: 'Categoría eliminada correctamente' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar la categoría' });
    }
  }
};

module.exports = categoryController;
