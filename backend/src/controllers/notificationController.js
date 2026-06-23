const { Notification, User } = require('../models');
const { Op } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      isRead,
      type,
      category 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // construimos el filtro de búsqueda
    const where = { user_id: userId };
    
    if (isRead !== undefined) {
      where.is_read = isRead === 'true';
    }
    
    if (type) {
      where.type = type;
    }
    
    if (category) {
      where.category = category;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        notifications: rows.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          category: n.category,
          isRead: n.is_read,
          readAt: n.read_at,
          actionUrl: n.action_url,
          metadata: n.metadata,
          createdAt: n.created_at,
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)) || 1,
        },
        unreadCount: await Notification.count({ where: { user_id: userId, is_read: false } }),
      },
    });
  } catch (err) {
    console.error('Error al obtener notificaciones:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener notificaciones' 
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await Notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (err) {
    console.error('Error al obtener el contador de no leídas:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener contador' 
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    if (!notification.is_read) {
      await notification.update({
        is_read: true,
        read_at: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
    });
  } catch (err) {
    console.error('Error al marcar como leída:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al marcar notificación' 
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          is_read: false,
        },
      }
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
    });
  } catch (err) {
    console.error('Error al marcar todas como leídas:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al marcar notificaciones' 
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (err) {
    console.error('Error al eliminar la notificación:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar notificación' 
    });
  }
};

const createNotification = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const {
      userId,
      title,
      message,
      type = 'info',
      category = 'system',
      actionUrl,
      metadata,
    } = req.body;

    // comprobamos que los campos obligatorios estén presentes
    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, title y message son requeridos',
      });
    }

    // Verify user exists
    const user = await User.findOne({
      where: {
        id: userId,
        ...(storeId ? { store_id: storeId } : {})
      }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en la tienda actual',
      });
    }

    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      category,
      action_url: actionUrl,
      metadata: metadata || {},
    });

    res.status(201).json({
      success: true,
      message: 'Notificación creada',
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        actionUrl: notification.action_url,
        createdAt: notification.created_at,
      },
    });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear notificación' 
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
