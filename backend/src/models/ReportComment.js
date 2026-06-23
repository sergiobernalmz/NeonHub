const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReportComment = sequelize.define('ReportComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    report_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'reports',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 5000]
      }
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si es true, solo visible para staff'
    }
  }, {
    tableName: 'report_comments',
    timestamps: true,
    indexes: [
      { fields: ['report_id'] },
      { fields: ['user_id'] }
    ]
  });

  return ReportComment;
};
