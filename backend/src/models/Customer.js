const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    customer_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    tax_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    billing_address: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      }
    },
    shipping_address: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      }
    },
    customer_type: {
      type: DataTypes.ENUM('individual', 'business'),
      allowNull: false,
      defaultValue: 'individual'
    },
    credit_limit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    payment_terms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Días de plazo de pago'
    },
    discount_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'customers',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['store_id', 'customer_code']
      },
      {
        unique: true,
        fields: ['store_id', 'email']
      },
      {
        fields: ['store_id']
      }
    ]
  });

  Customer.prototype.getFullName = function () {
    return `${this.first_name} ${this.last_name}`;
  };

  return Customer;
};
