const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'stores', key: 'id' }
    }
  }, {
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role_id', 'store_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['role_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return UserRole;
};