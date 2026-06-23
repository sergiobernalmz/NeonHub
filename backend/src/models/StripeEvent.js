const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StripeEvent = sequelize.define('StripeEvent', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('received', 'processing', 'processed', 'failed'),
      allowNull: false,
      defaultValue: 'received'
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'stripe_events',
    timestamps: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['received_at'] }
    ]
  });

  return StripeEvent;
};
