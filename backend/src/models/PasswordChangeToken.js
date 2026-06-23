const { DataTypes, Model, Op } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class PasswordChangeToken extends Model {
    static async create(email, origin) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      return PasswordChangeToken.build({ token, email, origin, expires_at, used: false }).save();
    }

    static async findValid(token) {
      return PasswordChangeToken.findOne({
        where: {
          token,
          used: false,
          expires_at: { [Op.gt]: new Date() }
        }
      });
    }

    static async markUsed(token) {
      return PasswordChangeToken.update({ used: true }, { where: { token } });
    }
  }

  PasswordChangeToken.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    origin: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['dashboard', 'landing']] }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PasswordChangeToken',
    tableName: 'password_change_tokens',
    timestamps: false
  });

  return PasswordChangeToken;
};
