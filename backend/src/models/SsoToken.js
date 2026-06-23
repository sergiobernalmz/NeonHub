const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SsoToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    token: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'sso_tokens',
    underscored: true,
    timestamps: true
  });
};
