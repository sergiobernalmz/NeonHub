const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserPermission = sequelize.define('UserPermission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    store_id: { type: DataTypes.UUID, allowNull: false },
    permissions: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'user_permissions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  UserPermission.getForUser = async function (userId, storeId) {
    const record = await this.findOne({ where: { user_id: userId, store_id: storeId } });
    return record ? record.permissions : {};
  };

  return UserPermission;
};
