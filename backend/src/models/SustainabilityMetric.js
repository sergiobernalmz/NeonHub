const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SustainabilityMetric = sequelize.define('SustainabilityMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    metric_type: {
      type: DataTypes.ENUM('carbon_footprint', 'energy_consumption', 'water_usage', 'waste_generated', 'recycling_rate'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    recorded_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'sustainability_metrics',
    timestamps: true
  });

  return SustainabilityMetric;
};