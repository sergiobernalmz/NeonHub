const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50],
        is: /^[a-zA-Z_]+$/
      }
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        users: {
          create: false,
          read: false,
          update: false,
          delete: false
        },
        products: {
          create: false,
          read: false,
          update: false,
          delete: false
        },
        orders: {
          create: false,
          read: false,
          update: false,
          delete: false
        },
        invoices: {
          create: false,
          read: false,
          update: false,
          delete: false
        },
        customers: {
          create: false,
          read: false,
          update: false,
          delete: false
        },
        dashboard: {
          view: false,
          analytics: false,
          reports: false
        },
        sustainability: {
          view: false,
          manage: false
        },
        system: {
          settings: false,
          backup: false,
          logs: false
        }
      }
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 1000
      }
    },
    scope: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'store',
      validate: {
        isIn: [['store', 'platform']]
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Los roles del sistema no se pueden borrar ni modificar'
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeDestroy: (role) => {
        if (role.is_system) {
          throw new Error('System roles cannot be deleted');
        }
      },
      beforeUpdate: (role) => {
        if (role.is_system && role.changed('permissions')) {
          throw new Error('System role permissions cannot be modified');
        }
      }
    }
  });

  Role.prototype.hasPermission = function (module, action) {
    if (!this.permissions || !this.permissions[module]) {
      return false;
    }
    return this.permissions[module][action] === true;
  };

  Role.prototype.grantPermission = function (module, action) {
    if (!this.permissions) {
      this.permissions = {};
    }
    if (!this.permissions[module]) {
      this.permissions[module] = {};
    }
    this.permissions[module][action] = true;
    this.changed('permissions', true);
  };

  Role.prototype.revokePermission = function (module, action) {
    if (this.permissions && this.permissions[module]) {
      this.permissions[module][action] = false;
      this.changed('permissions', true);
    }
  };

  Role.prototype.getAllPermissions = function () {
    const permissions = [];
    if (this.permissions) {
      Object.keys(this.permissions).forEach(module => {
        Object.keys(this.permissions[module]).forEach(action => {
          if (this.permissions[module][action]) {
            permissions.push(`${module}.${action}`);
          }
        });
      });
    }
    return permissions;
  };

  Role.getSystemRoles = function () {
    return [
      {
        name: 'superadmin',
        display_name: 'Super Administrator',
        description: 'Full system access with all permissions',
        level: 10,
        is_system: true,
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: true },
          invoices: { create: true, read: true, update: true, delete: true },
          customers: { create: true, read: true, update: true, delete: true },
          dashboard: { view: true, analytics: true, reports: true },
          sustainability: { view: true, manage: true },
          system: { settings: true, backup: true, logs: true }
        }
      },
      {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Administrative access with most permissions',
        level: 8,
        is_system: true,
        permissions: {
          users: { create: true, read: true, update: true, delete: false },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: true },
          invoices: { create: true, read: true, update: true, delete: true },
          customers: { create: true, read: true, update: true, delete: true },
          dashboard: { view: true, analytics: true, reports: true },
          sustainability: { view: true, manage: true },
          system: { settings: false, backup: false, logs: true }
        }
      },
      {
        name: 'manager',
        display_name: 'Manager',
        description: 'Management level access for business operations',
        level: 6,
        is_system: true,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: true, read: true, update: true, delete: false },
          orders: { create: true, read: true, update: true, delete: false },
          invoices: { create: true, read: true, update: true, delete: false },
          customers: { create: true, read: true, update: true, delete: false },
          dashboard: { view: true, analytics: true, reports: true },
          sustainability: { view: true, manage: false },
          system: { settings: false, backup: false, logs: false }
        }
      },
      {
        name: 'employee',
        display_name: 'Employee',
        description: 'Standard employee access for daily operations',
        level: 4,
        is_system: true,
        permissions: {
          users: { create: false, read: false, update: false, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: true, read: true, update: true, delete: false },
          invoices: { create: true, read: true, update: false, delete: false },
          customers: { create: true, read: true, update: true, delete: false },
          dashboard: { view: true, analytics: false, reports: false },
          sustainability: { view: true, manage: false },
          system: { settings: false, backup: false, logs: false }
        }
      },
      {
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access for viewing data',
        level: 2,
        is_system: true,
        permissions: {
          users: { create: false, read: false, update: false, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          invoices: { create: false, read: true, update: false, delete: false },
          customers: { create: false, read: true, update: false, delete: false },
          dashboard: { view: true, analytics: false, reports: false },
          sustainability: { view: true, manage: false },
          system: { settings: false, backup: false, logs: false }
        }
      }
    ];
  };

  return Role;
};
