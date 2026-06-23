const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
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
    order_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'completed'),
      allowNull: false,
      defaultValue: 'draft'
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    required_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    shipped_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discount_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    },
    shipping_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'EUR'
    },
    payment_status: {
      type: DataTypes.ENUM('pending_payment', 'processing', 'succeeded', 'partial', 'paid', 'failed', 'refunded', 'cancelled'),
      allowNull: true,
      defaultValue: 'pending_payment'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'ID del Payment Intent de Stripe'
    },
    stripe_charge_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID del Charge de Stripe tras el pago'
    },
    stripe_client_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Client secret para confirmar el pago en el frontend'
    },
    billing_address: {
      type: DataTypes.JSON,
      allowNull: true
    },
    internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    shipping_address: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    external_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    source_platform: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'neonhub'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['store_id', 'order_number']
      },
      {
        fields: ['store_id']
      },
      {
        fields: ['customer_id']
      }
    ]
  });

  return Order;
};
