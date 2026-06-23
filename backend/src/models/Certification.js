const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Certification = sequelize.define('Certification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      isUppercase: true,
      len: [2, 20]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 1000]
    }
  },
  type: {
    type: DataTypes.ENUM(
      'environmental',
      'energy',
      'quality',
      'social',
      'organic',
      'safety',
      'recycling'
    ),
    allowNull: false,
    defaultValue: 'environmental'
  },
  issuer: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  country: {
    type: DataTypes.STRING(3),
    allowNull: true,
    validate: {
      len: [2, 3]
    }
  },
  region: {
    type: DataTypes.ENUM('EU', 'US', 'GLOBAL', 'ASIA', 'AMERICA', 'AFRICA', 'OCEANIA'),
    allowNull: false,
    defaultValue: 'GLOBAL'
  },
  verificationMethod: {
    type: DataTypes.ENUM('third_party', 'self_declaration', 'government', 'api_verification'),
    allowNull: false,
    defaultValue: 'third_party'
  },
  apiEndpoint: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'API endpoint para verificación automática de la certificación'
  },
  apiKey: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Clave de API para verificación automática (encriptada)'
  },
  validityPeriod: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 365,
    validate: {
      min: 30,
      max: 3650
    },
    comment: 'Período de validez en días'
  },
  renewalRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  level: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum', 'basic', 'premium'),
    allowNull: true,
    comment: 'Nivel o grado de la certificación si aplica'
  },
  criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Criterios específicos de la certificación en formato JSON'
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del logo oficial de la certificación'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#22c55e',
    validate: {
      is: /^#[0-9a-fA-F]{6}$/
    },
    comment: 'Color representativo de la certificación en formato hex'
  },
  impact: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Impacto ambiental y beneficios de la certificación'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastApiCheck: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última verificación vía API'
  },
  apiStatus: {
    type: DataTypes.ENUM('active', 'inactive', 'error', 'pending'),
    allowNull: true,
    defaultValue: 'pending'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Metadatos adicionales específicos de cada certificación'
  }
}, {
  tableName: 'certifications',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['type']
    },
    {
      fields: ['region']
    }
  ]
});

Certification.prototype.isExpiringSoon = function(days = 30) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  return this.lastApiCheck && this.lastApiCheck < expirationDate;
};

Certification.prototype.needsVerification = function() {
  const now = new Date();
  const checkInterval = 7 * 24 * 60 * 60 * 1000;
  
  return !this.lastApiCheck || 
         (now - this.lastApiCheck) > checkInterval ||
         this.apiStatus !== 'active';
};

Certification.prototype.getDisplayColor = function() {
  const typeColors = {
    environmental: '#22c55e',
    energy: '#f59e0b',
    quality: '#3b82f6',
    social: '#8b5cf6',
    organic: '#10b981',
    safety: '#ef4444',
    recycling: '#06b6d4'
  };
  
  return this.color || typeColors[this.type] || '#6b7280';
};

Certification.findByType = function(type) {
  return this.findAll({
    where: { 
      type,
      isActive: true
    },
    order: [['name', 'ASC']]
  });
};

Certification.findByRegion = function(region) {
  return this.findAll({
    where: { 
      region: region.toUpperCase(),
      isActive: true
    },
    order: [['name', 'ASC']]
  });
};

Certification.findPendingVerification = function() {
  const { Op } = require('sequelize');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.findAll({
    where: {
      isActive: true,
      verificationMethod: 'api_verification',
      [Op.or]: [
        { lastApiCheck: null },
        { lastApiCheck: { [Op.lt]: sevenDaysAgo } },
        { apiStatus: { [Op.ne]: 'active' } }
      ]
    }
  });
};

module.exports = Certification;