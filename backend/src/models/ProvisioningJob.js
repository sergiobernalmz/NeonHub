const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProvisioningJob = sequelize.define('ProvisioningJob', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stripe_event_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      references: {
        model: 'stripe_events',
        key: 'id'
      }
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'queued'
    },
    retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'provisioning_jobs',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['retries'] },
      { fields: ['created_at'] }
    ]
  });

  return ProvisioningJob;
};
