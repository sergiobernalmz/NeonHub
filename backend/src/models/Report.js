const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    report_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Número único de reporte (ej: RPT-2025-001)'
    },
    type: {
      type: DataTypes.ENUM(
        'bug',
        'feature_request',
        'performance',
        'security',
        'customer_complaint',
        'product_issue',
        'return_request',
        'order_problem',
        'financial',
        'strategic',
        'analytics',
        'audit',
        'general'
      ),
      allowNull: false,
      comment: 'Tipo de reporte que determina a qué departamento se asigna'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Categoría específica dentro del tipo'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [3, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [5, 10000],
          msg: 'La descripción debe tener entre 5 y 10000 caracteres'
        }
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Prioridad del reporte'
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'assigned',
        'in_progress',
        'resolved',
        'closed',
        'rejected'
      ),
      allowNull: false,
      defaultValue: 'pending'
    },
    reporter_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuario que creó el reporte'
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuario asignado para resolver el reporte'
    },
    assigned_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Rol al que está dirigido el reporte (it, support, ceo, admin)'
    },
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Tipo de entidad relacionada (order, product, user, etc.)'
    },
    related_entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID de la entidad relacionada'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de URLs de archivos adjuntos (capturas, logs, etc.)'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Información adicional específica del tipo de reporte'
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre la resolución del reporte'
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha límite para resolver el reporte'
    },
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_urgent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'reports',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['report_number'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['reporter_id'] },
      { fields: ['assigned_to'] },
      { fields: ['assigned_role'] },
      { fields: ['created_at'] }
    ]
  });

  Report.prototype.canBeViewedBy = function (user) {
    if (this.reporter_id === user.id) return true;
    if (this.assigned_to === user.id) return true;
    if (user.roles?.some(r => r.name === 'admin')) return true;
    if (this.assigned_role && user.roles?.some(r => r.name === this.assigned_role)) {
      return true;
    }
    return false;
  };

  Report.prototype.canBeEditedBy = function (user) {
    if (this.reporter_id === user.id) return true;
    if (this.assigned_to === user.id) return true;
    if (user.roles?.some(r => ['admin', 'ceo'].includes(r.name))) return true;
    if (this.assigned_role && user.roles?.some(r => r.name === this.assigned_role)) {
      return true;
    }
    return false;
  };

  Report.prototype.incrementViews = async function () {
    this.views_count += 1;
    await this.save();
  };

  Report.prototype.assignTo = async function (userId) {
    this.assigned_to = userId;
    this.status = 'assigned';
    await this.save();
  };

  Report.prototype.markAsInProgress = async function () {
    this.status = 'in_progress';
    await this.save();
  };

  Report.prototype.resolve = async function (notes) {
    this.status = 'resolved';
    this.resolution_notes = notes;
    this.resolved_at = new Date();
    await this.save();
  };

  Report.prototype.close = async function () {
    this.status = 'closed';
    this.closed_at = new Date();
    await this.save();
  };

  Report.generateReportNumber = async function () {
    const year = new Date().getFullYear();
    const count = await Report.count({
      where: {
        report_number: {
          [sequelize.Sequelize.Op.like]: `RPT-${year}-%`
        }
      }
    });

    const nextNumber = String(count + 1).padStart(4, '0');
    return `RPT-${year}-${nextNumber}`;
  };

  // determinar rol según tipo de reporte
  Report.getRoleForType = function (type) {
    const roleMapping = {
      'bug': 'developer',
      'feature_request': 'developer',
      'performance': 'developer',
      'security': 'developer',
      'customer_complaint': 'support',
      'product_issue': 'support',
      'return_request': 'support',
      'order_problem': 'support',
      'financial': 'ceo',
      'strategic': 'ceo',
      'analytics': 'manager',
      'audit': 'admin',
      'general': 'admin'
    };

    return roleMapping[type] || 'admin';
  };

  return Report;
};
