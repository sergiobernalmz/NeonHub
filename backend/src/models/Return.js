const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Return = sequelize.define('Return', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'refunded', 'closed'),
      defaultValue: 'pending'
    },
    reason: {
      type: DataTypes.ENUM('defective', 'not_as_described', 'damaged', 'wrong_item', 'other'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refund_type: {
      type: DataTypes.ENUM('refund', 'exchange'),
      defaultValue: 'refund'
    },
    admin_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    stripe_refund_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'returns',
    timestamps: true
  });

  return Return;
};
