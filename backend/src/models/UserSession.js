const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = (sequelize) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    refresh_token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    device_name: { type: DataTypes.STRING(150) },
    browser:     { type: DataTypes.STRING(100) },
    os:          { type: DataTypes.STRING(100) },
    ip_address:  { type: DataTypes.STRING(45) },
    last_active: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    expires_at:  { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'user_sessions',
    underscored: true,
    timestamps: true,
    updatedAt: false
  });

  UserSession.hashToken = hashToken;

  UserSession.createSession = async (userId, refreshToken, { device_name, browser, os, ip_address, expires_at }) => {
    return UserSession.create({
      user_id: userId,
      refresh_token_hash: hashToken(refreshToken),
      device_name,
      browser,
      os,
      ip_address,
      last_active: new Date(),
      expires_at
    });
  };

  UserSession.findByTokenHash = (token) =>
    UserSession.findOne({ where: { refresh_token_hash: hashToken(token) } });

  UserSession.getActiveSessions = (userId) =>
    UserSession.findAll({
      where: { user_id: userId, expires_at: { [Op.gt]: new Date() } },
      order: [['last_active', 'DESC']]
    });

  UserSession.revokeSession = (sessionId, userId) =>
    UserSession.destroy({ where: { id: sessionId, user_id: userId } });

  UserSession.revokeAllSessions = (userId) =>
    UserSession.destroy({ where: { user_id: userId } });

  return UserSession;
};
