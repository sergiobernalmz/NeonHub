const jwt = require('jsonwebtoken');
const { User, Role, Store, UserStore } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    // admitimos el token en la cabecera Authorization o como query param (para URLs de imágenes)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: {
          code: 'TOKEN_REQUIRED',
          timestamp: new Date().toISOString()
        }
      });
    }

    // verificamos el token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Servidor mal configurado',
        error: {
          code: 'SERVER_MISCONFIGURED',
          detail: 'JWT_SECRET no está configurado',
          timestamp: new Date().toISOString()
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // buscamos el usuario, incluyendo los borrados suavemente para detectar deleted_at
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Store, as: 'store' },
        {
          model: Role,
          as: 'roles',
          through: { where: { is_active: true } },
          attributes: ['id', 'name', 'permissions', 'level', 'scope']
        },
        {
          model: UserStore,
          as: 'userStores',
          attributes: ['store_id', 'is_primary']
        }
      ],
      attributes: { exclude: ['password_hash'] },
      paranoid: false
    });

    if (!user || !user.is_active || user.deleted_at) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida',
        error: {
          code: 'USER_INACTIVE',
          timestamp: new Date().toISOString()
        }
      });
    }

    // añadimos los datos del usuario al request
    const normalizePermissions = (rawPermissions) => {
      const flattenPermissionObject = (obj) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
        return Object.entries(obj).flatMap(([resource, actions]) => {
          if (actions === '*') return [`${resource}.*`, `${resource}:*`];
          if (!actions || typeof actions !== 'object' || Array.isArray(actions)) return [];
          return Object.entries(actions)
            .filter(([, allowed]) => allowed === true)
            .flatMap(([action]) => [`${resource}.${action}`, `${resource}:${action}`]);
        });
      };

      if (!rawPermissions) return [];

      if (Array.isArray(rawPermissions)) return rawPermissions;

      if (typeof rawPermissions === 'object') {
        return flattenPermissionObject(rawPermissions);
      }

      if (typeof rawPermissions === 'string') {
        try {
          const parsed = JSON.parse(rawPermissions);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === 'object') return flattenPermissionObject(parsed);
          return [];
        } catch {
          return [];
        }
      }

      return [];
    };

    // userStores es un array (puede estar vacío) — un array vacío es truthy,
    // así que comprobamos la longitud antes de usar el store_id FK directo.
    const storeIds = (user.userStores && user.userStores.length > 0)
      ? user.userStores.map(us => us.store_id)
      : (user.store_id ? [user.store_id] : []);

    req.user = {
      id: user.id,
      storeId: user.store_id,
      storeIds,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      store: user.store || null,
      roles: user.roles || [],
      permissions: user.roles && user.roles.length > 0
        ? user.roles.flatMap(role => normalizePermissions(role.permissions))
        : [],
      isEmailVerified: user.email_verified,
      lastLoginAt: user.last_login_at
    };

    // sacamos los flags de proxy de superadmin del JWT
    if (decoded.isSuperAdminProxy === true) {
      req.user.isSuperAdminProxy = true;
      req.user.proxyStoreId = decoded.proxyStoreId;
    }

    // aislamiento de tenant: si hay contexto de tenant, el usuario debe pertenecer a esa tienda
    if (req.tenant && req.tenant.id) {
      const isSuperAdmin = req.user.roles.some(role =>
        role.name === 'superadmin' || role.scope === 'platform'
      );

      if (isSuperAdmin && req.user.isSuperAdminProxy) {
        // modo proxy: usamos siempre el tenant actual de la cabecera,
        // nunca el proxyStoreId que quedó guardado en el JWT al hacer login.
        req.user.storeId = req.tenant.id;
        req.user.storeIds = [req.tenant.id];
      } else if (!isSuperAdmin) {
        if (!req.user.storeIds.includes(req.tenant.id)) {
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado: el usuario no pertenece a esta tienda',
            error: {
              code: 'TENANT_ACCESS_DENIED',
              timestamp: new Date().toISOString()
            }
          });
        }
        // Scope al tenant activo — igual que el proxy de superadmin.
        // Sin esto, users.store_id (FK primaria) sobreescribía el tenant
        // correcto en usuarios con varias tiendas.
        req.user.storeId = req.tenant.id;
      }
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: {
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: {
          code: 'TOKEN_EXPIRED',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userPermissions = req.user.permissions || [];

      // admitimos un permiso suelto o un array de permisos
      const requiredPermissions = Array.isArray(permission) ? permission : [permission];

      // comprobamos si el usuario tiene alguno de los permisos requeridos (lógica OR)
      const hasPermission = userPermissions.includes('*') || // superadmin
        (req.user.roles && req.user.roles.some(role => role.name === 'superadmin' || role.scope === 'platform')) ||
        requiredPermissions.some(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            required: permission,
            userPermissions: userPermissions,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error en verificación de permisos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userRoleNames = req.user.roles ? req.user.roles.map(role => role.name) : [];
      const hasRequiredRole = requiredRoles.some(role => userRoleNames.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: 'Rol insuficiente',
          error: {
            code: 'INSUFFICIENT_ROLE',
            required: requiredRoles,
            current: userRoleNames,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error al comprobar el rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando permisos',
        error: {
          code: 'ROLE_CHECK_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

const requireRoleLevel = (minLevel) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userLevel = req.user.roles && req.user.roles.length > 0
        ? Math.max(...req.user.roles.map(role => role.level || 0))
        : 0;

      if (userLevel < minLevel) {
        return res.status(403).json({
          success: false,
          message: 'Nivel de rol insuficiente',
          error: {
            code: 'INSUFFICIENT_ROLE_LEVEL',
            required: minLevel,
            userLevel: userLevel,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error en verificación de nivel de rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

const requireOwnershipOrAdmin = (resourceIdParam = 'id', ownerField = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            timestamp: new Date().toISOString()
          }
        });
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user[ownerField];
      const isAdmin = (req.user.roles && req.user.roles.some(role =>
        role.level >= 80 || role.name === 'super_admin'));

      // dejamos pasar si el usuario es dueño del recurso o es admin
      if (resourceId === userId || isAdmin) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: no eres propietario del recurso',
        error: {
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: {
          code: 'USER_NOT_AUTHENTICATED',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userLevel = req.user.roles && req.user.roles.length > 0
      ? Math.max(...req.user.roles.map(role => role.level || 0))
      : 0;

    const hasAdminRole = req.user.roles && req.user.roles.some(role =>
      ['admin', 'superadmin'].includes(role.name) || role.level >= 80
    );

    if (!hasAdminRole || userLevel < 80) {
      return res.status(403).json({
        success: false,
        message: 'Se requieren privilegios de administrador',
        error: {
          code: 'ADMIN_PRIVILEGES_REQUIRED',
          userLevel: userLevel,
          requiredLevel: 80,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de privilegios de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const requireUserCreatePermission = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: {
          code: 'USER_NOT_AUTHENTICATED',
          timestamp: new Date().toISOString()
        }
      });
    }

    // comprobamos si el usuario puede crear usuarios o es admin de nivel alto
    const userLevel = req.user.roles && req.user.roles.length > 0
      ? Math.max(...req.user.roles.map(role => role.level || 0))
      : 0;

    const hasCreatePermission = req.user.permissions &&
      req.user.permissions.includes('users.create');

    const isHighLevelAdmin = userLevel >= 80; // nivel admin o superior

    if (!hasCreatePermission && !isHighLevelAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear usuarios',
        error: {
          code: 'USER_CREATE_PERMISSION_DENIED',
          userLevel: userLevel,
          userPermissions: req.user.permissions || [],
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de permisos de creación de usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    // admitimos el token en la cabecera o como query param (es opcional aquí)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    // intentamos verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        through: {
          where: { is_active: true }
        },
        attributes: ['id', 'name', 'permissions', 'level', 'scope']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles || [],
        permissions: user.roles && user.roles.length > 0
          ? user.roles.flatMap(role => {
            try {
              // parseamos los permisos de string JSON a array
              return Array.isArray(role.permissions)
                ? role.permissions
                : JSON.parse(role.permissions || '[]');
            } catch (e) {
              console.warn('Error parsing permissions for role:', role.name, e);
              return [];
            }
          })
          : [],
        isEmailVerified: user.email_verified,
        lastLoginAt: user.last_login_at
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // si el token no es válido, dejamos el usuario como null y seguimos
    req.user = null;
    next();
  }
};

const requirePlatformAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: { code: 'USER_NOT_AUTHENTICATED', timestamp: new Date().toISOString() }
      });
    }

    const isPlatformAdmin = req.user.roles && req.user.roles.some(role =>
      role.name === 'superadmin' || role.scope === 'platform'
    );

    if (!isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: se requiere superadmin de plataforma',
        error: { code: 'PLATFORM_ADMIN_REQUIRED', timestamp: new Date().toISOString() }
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de plataforma:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: { code: 'INTERNAL_SERVER_ERROR', timestamp: new Date().toISOString() }
    });
  }
};

module.exports = {
  authenticateToken,
  requireAuth: authenticateToken,
  requirePermission,
  requireRole,
  requireRoleLevel,
  requireOwnershipOrAdmin,
  requireAdmin,
  requireUserCreatePermission,
  requirePlatformAdmin,
  optionalAuth
};
