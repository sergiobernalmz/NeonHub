const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const getUserLevel = (req) =>
  req.user?.roles?.length
    ? Math.max(...req.user.roles.map(r => r.level || 0))
    : 0;

const VALID_ACTIONS = ['create', 'read', 'update', 'delete', 'login', 'logout'];

const auditLogController = {
  getAuditLogs: async (req, res) => {
    try {
      const userLevel    = getUserLevel(req);
      const isSuperAdmin = userLevel >= 100;

      const page   = Math.max(1, parseInt(req.query.page)  || 1);
      const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      const where = {};

      // aislamiento por tienda
      if (!isSuperAdmin) {
        const storeId = resolveStoreId(req);
        if (!storeId) {
          return res.status(403).json({ success: false, message: 'No se pudo determinar la tienda del usuario' });
        }
        where.store_id = storeId;
      }

      if (req.query.startDate || req.query.endDate) {
        where.created_at = {};
        if (req.query.startDate) {
          const start = new Date(req.query.startDate);
          if (isNaN(start.getTime())) {
            return res.status(400).json({ success: false, message: 'Formato de startDate inválido' });
          }
          where.created_at[Op.gte] = start;
        }
        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          if (isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: 'Formato de endDate inválido' });
          }
          end.setHours(23, 59, 59, 999);
          where.created_at[Op.lte] = end;
        }
      }

      if (req.query.action) {
        if (!VALID_ACTIONS.includes(req.query.action)) {
          return res.status(400).json({
            success: false,
            message: `Acción inválida. Valores permitidos: ${VALID_ACTIONS.join(', ')}`
          });
        }
        where.action = req.query.action;
      }

      if (req.query.resource_type) {
        where.resource_type = req.query.resource_type;
      }

      // solo superadmin
      if (req.query.user_id && isSuperAdmin) {
        where.user_id = req.query.user_id;
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        order:   [['created_at', 'DESC']],
        limit,
        offset,
        include: [{
          model:      User,
          as:         'user',
          attributes: ['id', 'username', 'email'],
          required:   false
        }]
      });

      return res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total:      count,
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Audit logs error:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
};

module.exports = auditLogController;
