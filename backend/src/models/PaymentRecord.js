const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentRecord = sequelize.define('PaymentRecord', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    amount_cents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Cantidad pagada en céntimos'
    },
    concept: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Concepto del pago (mensualidad, setup, extra, etc.)'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'manual',
      comment: 'Método: manual, stripe, transferencia'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    recorded_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Quién registró el pago'
    }
  }, {
    tableName: 'payment_records',
    timestamps: true,
    indexes: [
      { fields: ['store_id'] },
      { fields: ['payment_date'] }
    ]
  });

  return PaymentRecord;
};
