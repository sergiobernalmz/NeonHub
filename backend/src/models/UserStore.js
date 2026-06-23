const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserStore = sequelize.define('UserStore', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'user_stores',
    underscored: true,
    timestamps: true
  });

  return UserStore;
};
