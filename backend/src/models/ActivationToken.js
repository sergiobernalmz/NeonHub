const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const ActivationToken = sequelize.define('ActivationToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    token: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'activation_tokens',
    underscored: true,
    timestamps: false
  });

  ActivationToken.createForUser = async function (userId, storeId, type, ttlHours = 48) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return this.create({
      user_id: userId,
      store_id: storeId,
      type,
      expires_at: expiresAt
    });
  };

  ActivationToken.findValid = async function (tokenValue) {
    return this.findOne({
      where: {
        token: tokenValue,
        used: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
  };

  return ActivationToken;
};
