const { User, Role, Order } = require('../models');
const { Op } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const toDTO = (user) => ({
  id: user.id,
  username: user.username,
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  phone: user.phone,
  isActive: user.is_active,
  emailVerified: user.email_verified,
  createdAt: user.created_at || user.createdAt,
  lastLoginAt: user.last_login_at || user.lastLoginAt,
  roles: user.roles ? user.roles.map(r => ({
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    level: r.level
  })) : [],
  // Contadores de pedidos (si están disponibles)
  totalOrders: user.dataValues?.totalOrders || 0,
  totalSpent: user.dataValues?.totalSpent || 0
})

const customerController = {
  async list(req, res) {
    try {
      const { page = 1, limit = 10, search = '', status = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const storeId = resolveStoreId(req);
      const where = {
        ...(storeId ? { store_id: storeId } : {})
      };

      if (search) {
        where[Op.or] = [
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
        ];
      }

      if (status !== '') {
        where.is_active = status === 'active';
      }

      // Buscar usuarios con rol "customer"
      const { count, rows } = await User.findAndCountAll({
        where,
        include: [{
          model: Role,
          as: 'roles',
          where: { name: 'customer' }, // Solo usuarios con rol customer
          attributes: ['id', 'name', 'display_name', 'level'],
          through: { attributes: [] }
        }],
        attributes: {
          exclude: ['password_hash'],
          include: [
            // Subconsulta para contar pedidos (PostgreSQL usa comillas dobles)
            [
              User.sequelize.literal(`(
                SELECT COUNT(*)
                FROM orders
                WHERE orders.user_id = "User"."id"
                AND orders.store_id = "User"."store_id"
              )`),
              'totalOrders'
            ],
            // Subconsulta para total gastado
            [
              User.sequelize.literal(`(
                SELECT COALESCE(SUM(total_amount), 0)
                FROM orders
                WHERE orders.user_id = "User"."id"
                AND orders.store_id = "User"."store_id"
                AND orders.status NOT IN ('cancelled', 'refunded')
              )`),
              'totalSpent'
            ]
          ]
        },
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        subQuery: false
      });

      res.json({
        success: true,
        data: {
          customers: rows.map(toDTO),
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit)) || 1,
          },
        },
      });
    } catch (err) {
      console.error('Customers list error:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);
      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'level'],
          through: { attributes: [] }
        }, {
          model: Order,
          as: 'orders',
          attributes: ['id', 'order_number', 'status', 'total_amount', 'created_at'],
          limit: 10,
          order: [['created_at', 'DESC']]
        }],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

      // Verificar que sea un cliente
      const isCustomer = user.roles?.some(r => r.name === 'customer');
      if (!isCustomer) {
        return res.status(400).json({ success: false, message: 'El usuario no es un cliente' });
      }

      res.json({ success: true, data: { customer: toDTO(user) } });
    } catch (err) {
      console.error('Customer get error:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  async create(req, res) {
    // Los clientes ahora se crean desde /users con rol "customer"
    return res.status(400).json({
      success: false,
      message: 'Los clientes deben crearse desde la gestión de usuarios con rol "Cliente"'
    });
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);
      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }]
      });

      if (!user) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

      // Verificar que sea un cliente
      const isCustomer = user.roles?.some(r => r.name === 'customer');
      if (!isCustomer) {
        return res.status(400).json({ success: false, message: 'El usuario no es un cliente' });
      }

      const update = req.body || {};

      // Solo permitir actualizar ciertos campos
      await user.update({
        first_name: update.firstName ?? user.first_name,
        last_name: update.lastName ?? user.last_name,
        email: update.email ?? user.email,
        phone: update.phone ?? user.phone,
        is_active: update.isActive ?? user.is_active,
      });

      // Recargar con roles
      await user.reload({
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'level'],
          through: { attributes: [] }
        }]
      });

      res.json({ success: true, message: 'Cliente actualizado', data: { customer: toDTO(user) } });
    } catch (err) {
      console.error('Customer update error:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);
      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }]
      });

      if (!user) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

      // Verificar que sea un cliente
      const isCustomer = user.roles?.some(r => r.name === 'customer');
      if (!isCustomer) {
        return res.status(400).json({ success: false, message: 'El usuario no es un cliente' });
      }

      // borrado suave — solo desactivamos
      await user.update({ is_active: false });

      res.json({ success: true, message: 'Cliente desactivado' });
    } catch (err) {
      console.error('Customer delete error:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const storeId = resolveStoreId(req);
      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }]
      });

      if (!user) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

      // Verificar que sea un cliente
      const isCustomer = user.roles?.some(r => r.name === 'customer');
      if (!isCustomer) {
        return res.status(400).json({ success: false, message: 'El usuario no es un cliente' });
      }

      await user.update({ is_active: !!isActive });

      // Recargar con roles
      await user.reload({
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'level'],
          through: { attributes: [] }
        }]
      });

      res.json({ success: true, message: 'Estado de cliente actualizado', data: { customer: toDTO(user) } });
    } catch (err) {
      console.error('Customer status error:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },
};

module.exports = { customerController };
