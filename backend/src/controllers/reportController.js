const { Report, ReportComment, User, Role, Notification } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const getTenantUserIds = async (storeId) => {
  if (!storeId) return null;
  const users = await User.findAll({
    where: { store_id: storeId },
    attributes: ['id'],
    raw: true
  });
  return users.map(u => u.id);
};

const SUPERADMIN_ROLES = ['superadmin'];

const isSuperAdminUser = (user) =>
  user?.roles?.some(r => SUPERADMIN_ROLES.includes(r.name)) ?? false;

const findReportInTenant = async (reportId, storeId, user = null) => {
  if (!storeId) {
    if (!isSuperAdminUser(user)) throw new Error('Tenant context required');
    return Report.findByPk(reportId);
  }
  const tenantUserIds = await getTenantUserIds(storeId);
  if (!tenantUserIds || tenantUserIds.length === 0) return null;

  return Report.findOne({
    where: {
      id: reportId,
      reporter_id: { [Op.in]: tenantUserIds }
    }
  });
};

const reportController = {
  
  createReport: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const {
        type,
        category,
        title,
        description,
        priority,
        related_entity_type,
        related_entity_id,
        attachments,
        metadata
      } = req.body;
      const storeId = resolveStoreId(req);

      // Validaciones
      if (!type || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Tipo, título y descripción son requeridos'
        });
      }

      // Generar número de reporte único
      const report_number = await Report.generateReportNumber();

      // Determinar rol asignado basado en el tipo
      const assigned_role = Report.getRoleForType(type);

      // Buscar un usuario disponible con ese rol (asignación inteligente)
      const assignedUser = await findAvailableUserByRole(assigned_role, storeId);

      // Calcular fecha límite basada en prioridad
      const due_date = calculateDueDate(priority);

      // Crear el reporte
      const report = await Report.create({
        report_number,
        type,
        category,
        title,
        description,
        priority: priority || 'medium',
        reporter_id: req.user.id,
        assigned_to: assignedUser?.id,
        assigned_role,
        related_entity_type,
        related_entity_id,
        attachments: attachments || [],
        metadata: metadata || {},
        due_date,
        is_urgent: priority === 'critical',
        status: assignedUser ? 'assigned' : 'pending'
      }, { transaction });

      // Crear notificaciones
      await createReportNotifications(report, assignedUser, assigned_role, transaction, storeId);

      await transaction.commit();

      // Cargar el reporte con sus relaciones
      const fullReport = await Report.findByPk(report.id, {
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
          { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Reporte creado exitosamente',
        data: fullReport
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create report error:', error);

      // Manejar errores de validación de Sequelize
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        return res.status(400).json({
          success: false,
          message: messages,
          errors: error.errors.map(e => ({ field: e.path, message: e.message }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear el reporte',
        error: error.message
      });
    }
  },

  
  getReports: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        status,
        priority,
        assigned_to_me,
        created_by_me,
        assigned_role,
        search
      } = req.query;
      const storeId = resolveStoreId(req);

      const offset = (page - 1) * limit;
      const where = {};

      if (!storeId && !isSuperAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }

      const tenantUserIds = await getTenantUserIds(storeId);

      if (storeId) {
        if (!tenantUserIds || tenantUserIds.length === 0) {
          return res.json({
            success: true,
            data: {
              reports: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }

        where.reporter_id = { [Op.in]: tenantUserIds };
      }

      // Filtros
      if (type) where.type = type;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigned_role) where.assigned_role = assigned_role;

      if (assigned_to_me === 'true') {
        where.assigned_to = req.user.id;
      }

      if (created_by_me === 'true') {
        where.reporter_id = req.user.id;
      }

      // Búsqueda por texto
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { report_number: { [Op.like]: `%${search}%` } }
        ];
      }

      // Si no es admin, solo mostrar reportes relevantes
      const userRoles = req.user.roles ? req.user.roles.map(r => r.name) : [];
      if (!userRoles.includes('admin')) {
        const permissionOr = [
          { reporter_id: req.user.id },
          { assigned_to: req.user.id },
          ...(userRoles.length > 0 ? [{ assigned_role: { [Op.in]: userRoles } }] : [])
        ];

        if (where[Op.or]) {
          where[Op.and] = [...(where[Op.and] || []), { [Op.or]: permissionOr }];
        } else {
          where[Op.or] = permissionOr;
        }
      }

      const { count, rows: reports } = await Report.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [
          ['is_urgent', 'DESC'],
          ['priority', 'DESC'],
          ['created_at', 'DESC']
        ],
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener reportes',
        error: error.message
      });
    }
  },

  
  getReportById: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      if (!storeId && !isSuperAdminUser(req.user)) {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }

      const report = await Report.findOne({
        where: {
          id,
          ...(storeId ? {
            reporter_id: { [Op.in]: await getTenantUserIds(storeId) }
          } : {})
        },
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url']
          },
          {
            model: ReportComment,
            as: 'comments',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url']
              }
            ],
            order: [['created_at', 'ASC']]
          }
        ]
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Reporte no encontrado'
        });
      }

      // Verificar permisos
      if (!report.canBeViewedBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver este reporte'
        });
      }

      // Incrementar contador de vistas
      await report.incrementViews();

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get report by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el reporte',
        error: error.message
      });
    }
  },

  
  updateReport: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const storeId = resolveStoreId(req);

      const report = await findReportInTenant(id, storeId, req.user);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Reporte no encontrado'
        });
      }

      // Verificar permisos
      if (!report.canBeEditedBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para editar este reporte'
        });
      }

      // Campos que se pueden actualizar
      const allowedUpdates = [
        'title', 'description', 'priority', 'status',
        'category', 'attachments', 'metadata', 'resolution_notes'
      ];

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          report[key] = updates[key];
        }
      });

      // Si se cambia el estado a resuelto, agregar timestamp
      if (updates.status === 'resolved' && !report.resolved_at) {
        report.resolved_at = new Date();
      }

      // Si se cambia el estado a cerrado, agregar timestamp
      if (updates.status === 'closed' && !report.closed_at) {
        report.closed_at = new Date();
      }

      await report.save();

      const updatedReport = await Report.findByPk(id, {
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
          { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] }
        ]
      });

      res.json({
        success: true,
        message: 'Reporte actualizado exitosamente',
        data: updatedReport
      });
    } catch (error) {
      if (error.message === 'Tenant context required') {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }
      console.error('Update report error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el reporte',
        error: error.message
      });
    }
  },

  
  assignReport: async (req, res) => {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;
      const storeId = resolveStoreId(req);

      const report = await findReportInTenant(id, storeId, req.user);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Reporte no encontrado'
        });
      }

      // Verificar que el usuario existe
      const user = await User.findOne({
        where: {
          id: assigned_to,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      await report.assignTo(assigned_to);

      // Crear notificación para el usuario asignado
      await Notification.create({
        user_id: assigned_to,
        type: 'report_assigned',
        title: 'Nuevo reporte asignado',
        message: `Se te ha asignado el reporte: ${report.title}`,
        action_url: `/reports/${report.id}`,
        metadata: {
          report_id: report.id,
          report_number: report.report_number,
          priority: report.priority
        }
      });

      const updatedReport = await Report.findByPk(id, {
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Reporte asignado exitosamente',
        data: updatedReport
      });
    } catch (error) {
      if (error.message === 'Tenant context required') {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }
      console.error('Assign report error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al asignar el reporte',
        error: error.message
      });
    }
  },

  
  addComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { comment, attachments, is_internal } = req.body;
      const storeId = resolveStoreId(req);

      const report = await findReportInTenant(id, storeId, req.user);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Reporte no encontrado'
        });
      }

      if (!report.canBeViewedBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para comentar en este reporte'
        });
      }

      const reportComment = await ReportComment.create({
        report_id: id,
        user_id: req.user.id,
        comment,
        attachments: attachments || [],
        is_internal: is_internal || false
      });

      const fullComment = await ReportComment.findByPk(reportComment.id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] }
        ]
      });

      // Notificar al creador del reporte si no es quien comenta
      if (report.reporter_id !== req.user.id) {
        await Notification.create({
          user_id: report.reporter_id,
          type: 'report_comment',
          title: 'Nuevo comentario en tu reporte',
          message: `${req.user.first_name} ha comentado en tu reporte: ${report.title}`,
          action_url: `/reports/${report.id}`,
          metadata: {
            report_id: report.id,
            report_number: report.report_number,
            comment_id: reportComment.id
          }
        });
      }

      // Notificar al asignado si existe y no es quien comenta
      if (report.assigned_to && report.assigned_to !== req.user.id) {
        await Notification.create({
          user_id: report.assigned_to,
          type: 'report_comment',
          title: 'Nuevo comentario en reporte asignado',
          message: `${req.user.first_name} ha comentado en el reporte: ${report.title}`,
          action_url: `/reports/${report.id}`,
          metadata: {
            report_id: report.id,
            report_number: report.report_number,
            comment_id: reportComment.id
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Comentario agregado exitosamente',
        data: fullComment
      });
    } catch (error) {
      if (error.message === 'Tenant context required') {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar comentario',
        error: error.message
      });
    }
  },

  
  getReportStats: async (req, res) => {
    try {
      console.log('>>> [DEBUG 17:50] getReportStats CALLED - Validating connection...');
      console.log('getReportStats - User:', req.user);
      console.log('getReportStats - User roles:', req.user?.roles);

      // Validar que el usuario tenga roles cargados
      const userRoles = req.user.roles ? req.user.roles.map(r => r.name) : [];
      const isAdmin = userRoles.includes('admin');
      const storeId = resolveStoreId(req);
      const tenantUserIds = await getTenantUserIds(storeId);

      console.log('User roles:', userRoles);
      console.log('Is admin:', isAdmin);

      // Filtro base según permisos
      let baseWhere = {};

      if (storeId) {
        if (!tenantUserIds || tenantUserIds.length === 0) {
          return res.json({
            success: true,
            data: {
              total: 0,
              assignedToMe: 0,
              urgent: 0,
              byStatus: [],
              byPriority: [],
              byType: []
            }
          });
        }

        baseWhere.reporter_id = { [Op.in]: tenantUserIds };
      }

      if (!isAdmin) {
        const orConditions = [
          { reporter_id: req.user.id },
          { assigned_to: req.user.id }
        ];

        if (userRoles.length > 0) {
          orConditions.push({ assigned_role: { [Op.in]: userRoles } });
        }

        // combinamos el filtro de permisos con el de tenant, sin reemplazarlo
        baseWhere = { ...baseWhere, [Op.or]: orConditions };
      }

      console.log('Base where:', JSON.stringify(baseWhere, null, 2));

      // Total de reportes
      const totalReports = await Report.count({ where: baseWhere });

      // Por estado
      const byStatus = await Report.findAll({
        where: baseWhere,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      // Por prioridad
      const byPriority = await Report.findAll({
        where: baseWhere,
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['priority']
      });

      // Por tipo
      const byType = await Report.findAll({
        where: baseWhere,
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['type']
      });

      // Reportes asignados a mí
      let assignedToMeWhere;
      if (isAdmin || Object.keys(baseWhere).length === 0) {
        assignedToMeWhere = {
          assigned_to: req.user.id,
          status: { [Op.notIn]: ['closed', 'resolved'] }
        };
      } else {
        assignedToMeWhere = {
          [Op.and]: [
            baseWhere,
            {
              assigned_to: req.user.id,
              status: { [Op.notIn]: ['closed', 'resolved'] }
            }
          ]
        };
      }

      const assignedToMe = await Report.count({ where: assignedToMeWhere });

      // Reportes urgentes
      let urgentWhere;
      if (isAdmin || Object.keys(baseWhere).length === 0) {
        urgentWhere = {
          is_urgent: true,
          status: { [Op.notIn]: ['closed', 'resolved'] }
        };
      } else {
        urgentWhere = {
          [Op.and]: [
            baseWhere,
            {
              is_urgent: true,
              status: { [Op.notIn]: ['closed', 'resolved'] }
            }
          ]
        };
      }

      const urgentReports = await Report.count({ where: urgentWhere });

      res.json({
        success: true,
        data: {
          total: totalReports,
          assignedToMe,
          urgent: urgentReports,
          byStatus: byStatus.map(s => ({ status: s.status, count: parseInt(s.dataValues.count) })),
          byPriority: byPriority.map(p => ({ priority: p.priority, count: parseInt(p.dataValues.count) })),
          byType: byType.map(t => ({ type: t.type, count: parseInt(t.dataValues.count) }))
        }
      });
    } catch (error) {
      console.error('========================================');
      console.error('GET REPORT STATS ERROR:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('========================================');
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  },

  
  deleteReport: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const report = await findReportInTenant(id, storeId, req.user);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Reporte no encontrado'
        });
      }

      // Solo admins o el creador pueden eliminar
      const isAdmin = req.user.roles.some(r => r.name === 'admin');
      if (!isAdmin && report.reporter_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar este reporte'
        });
      }

      await report.destroy(); // borrado suave (paranoid)

      res.json({
        success: true,
        message: 'Reporte eliminado exitosamente'
      });
    } catch (error) {
      if (error.message === 'Tenant context required') {
        return res.status(403).json({ success: false, message: 'Tenant context required' });
      }
      console.error('Delete report error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el reporte',
        error: error.message
      });
    }
  }
};

// Buscar usuario disponible por rol con menor carga de trabajo
async function findAvailableUserByRole(roleName, storeId = null) {
  try {
    // Buscar usuarios con el rol especificado
    const users = await User.findAll({
      include: [{
        model: Role,
        as: 'roles',
        where: { name: roleName },
        attributes: []
      }],
      where: {
        is_active: true,
        ...(storeId ? { store_id: storeId } : {})
      }
    });

    if (users.length === 0) return null;

    // Contar reportes activos asignados a cada usuario
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const activeReports = await Report.count({
          where: {
            assigned_to: user.id,
            status: { [Op.notIn]: ['closed', 'resolved'] }
          }
        });
        return { user, activeReports };
      })
    );

    // Ordenar por menor carga de trabajo
    usersWithCounts.sort((a, b) => a.activeReports - b.activeReports);

    return usersWithCounts[0].user;
  } catch (error) {
    console.error('Error finding available user:', error);
    return null;
  }
}

// Calcular fecha límite basada en prioridad
function calculateDueDate(priority) {
  const now = new Date();
  const daysToAdd = {
    'critical': 1,  // 1 día
    'high': 3,      // 3 días
    'medium': 7,    // 1 semana
    'low': 14       // 2 semanas
  };

  const days = daysToAdd[priority] || 7;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// Crear notificaciones para el reporte
async function createReportNotifications(report, assignedUser, assigned_role, transaction, storeId = null) {
  const notifications = [];

  // Si se asignó a un usuario específico, notificarle
  if (assignedUser) {
    notifications.push({
      user_id: assignedUser.id,
      type: 'report_assigned',
      title: 'Nuevo reporte asignado',
      message: `Se te ha asignado un nuevo reporte: ${report.title}`,
      action_url: `/reports/${report.id}`,
      metadata: {
        report_id: report.id,
        report_number: report.report_number,
        priority: report.priority,
        type: report.type
      }
    });
  } else {
    // Si no se asignó a nadie, notificar a todos con ese rol
    const usersWithRole = await User.findAll({
      include: [{
        model: Role,
        as: 'roles',
        where: { name: assigned_role },
        attributes: []
      }],
      where: {
        is_active: true,
        ...(storeId ? { store_id: storeId } : {})
      },
      attributes: ['id']
    });

    usersWithRole.forEach(user => {
      notifications.push({
        user_id: user.id,
        type: 'new_report',
        title: 'Nuevo reporte pendiente',
        message: `Hay un nuevo reporte que requiere atención: ${report.title}`,
        action_url: `/reports/${report.id}`,
        metadata: {
          report_id: report.id,
          report_number: report.report_number,
          priority: report.priority,
          type: report.type
        }
      });
    });
  }

  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications, { transaction });
  }
}

module.exports = { reportController };
