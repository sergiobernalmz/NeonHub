const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        is: /^[a-zA-Z0-9_]+$/
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[+]?[0-9\s\-\(\)]+$/
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'avatar_url'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at'
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    verification_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        dashboard: {
          layout: 'grid',
          widgets: ['orders', 'revenue', 'customers', 'sustainability']
        }
      }
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['password_hash', 'password_reset_token'] }
    },
    scopes: {
      withPassword: {
        attributes: { exclude: ['password_reset_token'] }
      },
      withTokens: {
        attributes: { include: ['password_reset_token'] }
      }
    }
  });

  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  User.prototype.getFullName = function () {
    return `${this.first_name} ${this.last_name}`;
  };

  User.prototype.isLocked = function () {
    return this.locked_until && this.locked_until > Date.now();
  };

  User.prototype.incrementLoginAttempts = async function () {
    // si el bloqueo anterior ha expirado, reiniciar a 1
    if (this.locked_until && this.locked_until < Date.now()) {
      await this.update({ login_attempts: 1, locked_until: null });
      return { justLocked: false };
    }

    const updates = { login_attempts: this.login_attempts + 1 };
    let justLocked = false;

    // bloquear cuenta tras 5 intentos fallidos durante 2 horas
    if (this.login_attempts + 1 >= 5 && !this.isLocked()) {
      updates.locked_until = new Date(Date.now() + 2 * 60 * 60 * 1000);
      justLocked = true;
    }

    await this.update(updates);
    return { justLocked, lockedUntil: updates.locked_until || null };
  };

  User.prototype.resetLoginAttempts = async function () {
    return this.update({
      login_attempts: 0,
      locked_until: null
    });
  };

  User.prototype.updateLastLogin = async function () {
    return this.update({ last_login_at: new Date() });
  };

  User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    delete values.password_reset_token;
    return values;
  };

  return User;
};
