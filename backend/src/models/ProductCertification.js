const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductCertification = sequelize.define('ProductCertification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'product_id'
  },
  certificationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'certification_id'
  },
  certificationNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    },
    comment: 'Número único de certificación del producto'
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isBefore: function(value) {
        const now = new Date();
        if (new Date(value) > now) {
          throw new Error('La fecha de emisión no puede ser futura');
        }
      }
    }
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: function(value) {
        if (this.issueDate && new Date(value) <= new Date(this.issueDate)) {
          throw new Error('La fecha de expiración debe ser posterior a la fecha de emisión');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'pending', 'revoked'),
    allowNull: false,
    defaultValue: 'active'
  },
  verificationStatus: {
    type: DataTypes.ENUM('verified', 'unverified', 'error', 'pending'),
    allowNull: false,
    defaultValue: 'pending'
  },
  score: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0.0,
      max: 10.0
    },
    comment: 'Puntuación de la certificación (0-10) si aplica'
  },
  level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Nivel específico del producto en esta certificación'
  },
  certifyingBody: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    },
    comment: 'Organismo certificador específico'
  },
  certificateUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'URL del certificado digital oficial'
  },
  verificationUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'URL para verificación online del certificado'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'URLs de documentos relacionados con la certificación'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Costo de obtención de la certificación'
  },
  renewalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Costo de renovación de la certificación'
  },
  lastVerification: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última verificación automática realizada'
  },
  nextVerification: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Próxima verificación programada'
  },
  verificationData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Datos obtenidos de la última verificación API'
  },
  alertsSent: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Control de alertas enviadas (30d, 15d, 7d, expired)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales sobre esta certificación del producto'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Si la certificación es visible públicamente en la tienda'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Prioridad de visualización (1=más importante)'
  },
  auditTrail: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Historial de cambios y verificaciones'
  }
}, {
  tableName: 'product_certifications',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['status']
    }
  ]
});

// Hooks
ProductCertification.addHook('beforeCreate', (productCertification) => {
  // próxima verificación a los 30 días por defecto
  if (!productCertification.nextVerification) {
    const nextVerification = new Date();
    nextVerification.setDate(nextVerification.getDate() + 30);
    productCertification.nextVerification = nextVerification;
  }

  // inicializar historial de auditoría
  if (!productCertification.auditTrail) {
    productCertification.auditTrail = [{
      action: 'created',
      timestamp: new Date(),
      status: productCertification.status,
      user: 'system'
    }];
  }
});

ProductCertification.addHook('beforeUpdate', (productCertification, options) => {
  // actualizar historial si cambia el estado
  if (productCertification.changed('status') || productCertification.changed('verificationStatus')) {
    const currentAudit = productCertification.auditTrail || [];
    currentAudit.push({
      action: 'updated',
      timestamp: new Date(),
      changes: productCertification.changed(),
      status: productCertification.status,
      verificationStatus: productCertification.verificationStatus,
      user: options.user || 'system'
    });
    productCertification.auditTrail = currentAudit;
  }
});

// Métodos de instancia
ProductCertification.prototype.isExpired = function() {
  return new Date() > this.expiryDate;
};

ProductCertification.prototype.isExpiringSoon = function(days = 30) {
  const now = new Date();
  const warningDate = new Date(this.expiryDate.getTime() - (days * 24 * 60 * 60 * 1000));
  return now >= warningDate && now < this.expiryDate;
};

ProductCertification.prototype.getDaysUntilExpiry = function() {
  const now = new Date();
  const timeDiff = this.expiryDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

ProductCertification.prototype.needsVerification = function() {
  return !this.nextVerification || new Date() >= this.nextVerification;
};

ProductCertification.prototype.updateStatus = function() {
  if (this.isExpired()) {
    this.status = 'expired';
  } else if (this.verificationStatus === 'error') {
    this.status = 'suspended';
  } else if (this.verificationStatus === 'verified') {
    this.status = 'active';
  }

  return this.save();
};

ProductCertification.prototype.shouldSendAlert = function(type) {
  const alerts = this.alertsSent || {};
  const now = new Date();
  const lastAlert = alerts[type] ? new Date(alerts[type]) : null;

  // no enviar más de una alerta del mismo tipo por día
  if (lastAlert) {
    const timeDiff = now.getTime() - lastAlert.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff >= 1;
  }

  return true;
};

ProductCertification.prototype.markAlertSent = function(type) {
  const alerts = this.alertsSent || {};
  alerts[type] = new Date();
  this.alertsSent = alerts;
  return this.save();
};

// Métodos estáticos
ProductCertification.findExpiring = function(days = 30) {
  const { Op } = require('sequelize');
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);

  return this.findAll({
    where: {
      status: 'active',
      expiryDate: {
        [Op.between]: [new Date(), warningDate]
      }
    },
    include: ['Product', 'Certification'],
    order: [['expiryDate', 'ASC']]
  });
};

ProductCertification.findExpired = function() {
  const { Op } = require('sequelize');

  return this.findAll({
    where: {
      expiryDate: {
        [Op.lt]: new Date()
      },
      status: {
        [Op.ne]: 'expired'
      }
    },
    include: ['Product', 'Certification']
  });
};

ProductCertification.findPendingVerification = function() {
  const { Op } = require('sequelize');

  return this.findAll({
    where: {
      [Op.or]: [
        { nextVerification: null },
        { nextVerification: { [Op.lte]: new Date() } }
      ],
      status: 'active'
    },
    include: ['Product', 'Certification']
  });
};

ProductCertification.getByProduct = function(productId, activeOnly = true) {
  const whereClause = { productId };
  if (activeOnly) {
    whereClause.status = 'active';
    whereClause.isPublic = true;
  }

  return this.findAll({
    where: whereClause,
    include: ['Certification'],
    order: [['priority', 'ASC'], ['expiryDate', 'DESC']]
  });
};

module.exports = ProductCertification;
