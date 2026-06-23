const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { User, Role, UserRole, UserStore, ActivationToken, UserPermission, UserSession, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sendDeletionEmail } = require('../services/emailService');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const userController = {
  // obtener todos los usuarios
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
      const storeId = resolveStoreId(req);

      const offset = (page - 1) * limit;
      const whereClause = {
        ...(storeId ? { store_id: storeId } : {}),
        email: { [Op.notIn]: ['demo@neonhub.es', 'superadmin@neonhub.es'] }
      };

      // filtro de búsqueda por nombre, usuario o email
      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } }
        ];
      }

      // filtro por estado del usuario
      if (status === 'unverified') {
        whereClause.email_verified = false;
      } else if (status !== '') {
        whereClause.is_active = status === 'active';
      }

      const includeClause = [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'display_name', 'level']
      }];

      // filtro por rol
      if (role) {
        includeClause[0].where = { name: role };
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: includeClause,
        attributes: { exclude: ['password_hash'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        raw: false // Asegurar que no se usa raw
      });

      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            createdAt: user.createdAt || user.created_at, // Usar ambos aliases
            lastLoginAt: user.lastLoginAt || user.last_login_at,
            roles: user.roles.map(role => ({
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              level: role.level
            }))
          })),
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // obtener todos los roles
  getAllRoles: async (req, res) => {
    try {
      // 🔒 FILTRO DE SEGURIDAD: Solo mostrar roles de nivel inferior al usuario actual
      const currentUserMaxLevel = Math.max(...req.user.roles.map(role => role.level));

      const roles = await Role.findAll({
        where: {
          is_active: true,
          scope: 'store',
          level: { [Op.lt]: currentUserMaxLevel }
        },
        attributes: ['id', 'name', 'display_name', 'description', 'level', 'scope'],
        order: [['level', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            displayName: role.display_name, // Convertir a camelCase para consistencia
            description: role.description,
            level: role.level
          })),
          currentUserLevel: currentUserMaxLevel,
          message: `Mostrando roles de nivel inferior a ${currentUserMaxLevel}`
        }
      });
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // obtener usuario por ID
  // perfil del usuario actual (cualquier usuario puede ver su propio perfil)
  getMyProfile: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const user = await User.findOne({
        where: {
          id: req.user.id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'display_name', 'level']
        }],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address,
          theme_preference: user.theme_preference || 'dark',
          isActive: user.is_active,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          roles: user.roles.map(role => ({
            id: role.id,
            name: role.name,
            displayName: role.display_name,
            level: role.level
          }))
        }
      });
    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // actualizar perfil del usuario actual (cualquier usuario puede actualizar el suyo)
  updateMyProfile: async (req, res) => {
    try {
      const { firstName, lastName, phone, address, email, theme_preference } = req.body;
      const storeId = resolveStoreId(req);

      const user = await User.findOne({
        where: {
          id: req.user.id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // comprobamos si cambia el email y si ya existe
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email,
            ...(storeId ? { store_id: storeId } : {}),
            id: { [Op.ne]: req.user.id }
          }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'El email ya está en uso'
          });
        }
      }

      // actualizamos los campos
      if (firstName !== undefined) user.first_name = firstName;
      if (lastName !== undefined) user.last_name = lastName;
      if (phone !== undefined) user.phone = phone || null;
      if (address !== undefined) user.address = address;
      if (email !== undefined) user.email = email;
      if (theme_preference !== undefined) user.theme_preference = theme_preference;

      await user.save();

      res.json({
        success: true,
        message: 'Perfil actualizado correctamente',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address,
          theme_preference: user.theme_preference || 'dark'
        }
      });
    } catch (error) {
      console.error('Update my profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'display_name', 'level']
        }],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at,
            roles: user.roles.map(role => ({
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              level: role.level
            }))
          }
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // crear nuevo usuario
  createUser: async (req, res) => {
    try {
      console.log('=== USER CREATION DEBUG ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // validamos los datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('=== ERRORES DE VALIDACIÓN ===');

        // Organizar errores por campo
        const errorsByField = {};
        errors.array().forEach(error => {
          const key = error.path || error.param || 'unknown';
          if (!errorsByField[key]) {
            errorsByField[key] = [];
          }
          errorsByField[key].push(error.msg);
        });

        // Mostrar errores organizados
        Object.keys(errorsByField).forEach(field => {
          console.log(`❌ ${field}:`);
          errorsByField[field].forEach(msg => {
            console.log(`   • ${msg}`);
          });
        });

        // Crear mensaje de respuesta más claro
        const formattedErrors = Object.keys(errorsByField).map(field => ({
          field,
          messages: errorsByField[field]
        }));

        return res.status(400).json({
          message: 'Datos incorrectos',
          errors: formattedErrors,
          details: 'Revisa los campos marcados e inténtalo de nuevo'
        });
      }

      const { username, email, password, firstName, lastName, phone, roleId } = req.body;
      const storeId = resolveStoreId(req);

      // comprobamos los límites del plan
      if (storeId) {
        const { Store } = require('../models');
        const store = await Store.findByPk(storeId);
        if (store && store.settings && store.settings.limits) {
          const { max_users } = store.settings.limits;
          if (max_users && max_users !== -1) {
            const count = await User.count({ where: { store_id: storeId } });
            if (count >= max_users) {
              return res.status(403).json({
                success: false,
                message: `Límite de usuarios excedido (${max_users}). Actualiza tu plan para añadir más.`
              });
            }
          }
        }
      }

      // comprobamos si el usuario ya existe
      const existingUser = await User.findOne({
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El usuario o email ya existe'
        });
      }

      // generamos una contraseña temporal aleatoria — el empleado la cambiará al activar la cuenta
      const tempPassword = crypto.randomBytes(18).toString('base64url');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

      // creamos el usuario inactivo y sin verificar hasta que active la cuenta por email
      const user = await User.create({
        ...(storeId ? { store_id: storeId } : {}),
        username,
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        is_active: false,
        email_verified: false
      });

      // Assign role
      let assignedRole;
      if (roleId) {
        assignedRole = await Role.findByPk(roleId);
        if (!assignedRole) {
          return res.status(400).json({
            success: false,
            message: 'Rol especificado no encontrado'
          });
        }
      } else {
        assignedRole = await Role.findOne({ where: { name: 'employee' } });
      }

      if (assignedRole) {
        await user.addRole(assignedRole, { through: { store_id: storeId, is_active: true } });
      }

      // nos aseguramos de que el empleado aparezca en user_stores para el aislamiento por tenant
      if (storeId) {
        await UserStore.findOrCreate({
          where: { user_id: user.id, store_id: storeId },
          defaults: { user_id: user.id, store_id: storeId, is_primary: true }
        });
      }

      // creamos el token de activación con TTL de 48h
      let activationToken = null;
      if (storeId) {
        try {
          activationToken = await ActivationToken.createForUser(user.id, storeId, 'employee_activation', 48);

          const webhookUrl = process.env.N8N_EMPLOYEE_ACTIVATION_WEBHOOK;
          if (webhookUrl) {
            const subdomain = req.tenant?.subdomain;
            const baseDomain = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';
            const activationLink = subdomain
              ? `https://${subdomain}.${baseDomain}/activate?token=${activationToken.token}`
              : `${process.env.FRONTEND_URL || `https://${req.hostname}`}/activate?token=${activationToken.token}`;

            await axios.post(webhookUrl, {
              email: user.email,
              username: user.username || user.first_name,
              store_name: req.tenant?.name,
              store_logo: req.tenant?.settings?.branding?.logo_url || null,
              activation_url: activationLink,
              expires_hours: 48
            }, { timeout: 8000 });
          }
        } catch (webhookErr) {
          console.error('[createUser] Activation webhook failed:', webhookErr.message);
          // no es fatal — el token existe y el email se puede reenviar después
        }
      }

      res.status(201).json({
        success: true,
        message: 'Usuario creado. Se ha enviado un email de activación.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            isActive: user.is_active,
            role: assignedRole ? {
              id: assignedRole.id,
              name: assignedRole.name,
              displayName: assignedRole.display_name
            } : null
          }
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // actualizar usuario
  updateUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { firstName, lastName, email, phone } = req.body;
      const storeId = resolveStoreId(req);

      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // comprobamos si cambia el email y si ya está en uso
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email,
            ...(storeId ? { store_id: storeId } : {}),
            id: { [Op.ne]: id }
          }
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'El email ya está en uso por otro usuario'
          });
        }
      }

      // actualizamos los datos
      await user.update({
        first_name: firstName || user.first_name,
        last_name: lastName || user.last_name,
        email: email || user.email,
        phone: phone !== undefined ? phone : user.phone
      });

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone
          }
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // actualizar rol del usuario
  updateUserRole: async (req, res) => {
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      const storeId = resolveStoreId(req);

      // 🚫 RESTRICCIÓN 1: No permitir auto-modificación
      if (req.user.id === id) {
        return res.status(403).json({
          success: false,
          message: 'No puedes modificar tu propio rol'
        });
      }

      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const newRole = await Role.findByPk(roleId);
      if (!newRole) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      // 🚫 RESTRICCIÓN 2: No permitir asignar roles de nivel superior al propio
      const currentUserMaxLevel = Math.max(...req.user.roles.map(role => role.level));

      if (newRole.level >= currentUserMaxLevel) {
        return res.status(403).json({
          success: false,
          message: `No puedes asignar un rol de nivel ${newRole.level} cuando tu nivel máximo es ${currentUserMaxLevel}. Solo puedes asignar roles de nivel inferior al tuyo.`
        });
      }

      // eliminamos todos los roles actuales y asignamos el nuevo
      await user.setRoles([newRole]);

      res.json({
        success: true,
        message: 'Rol de usuario actualizado exitosamente',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: {
              id: newRole.id,
              name: newRole.name,
              displayName: newRole.display_name,
              level: newRole.level
            }
          }
        }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // actualizar estado del usuario
  updateUserStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const storeId = resolveStoreId(req);

      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Prevent deactivating yourself
      if (id === req.user.id && !isActive) {
        return res.status(400).json({
          success: false,
          message: 'No puedes desactivar tu propia cuenta'
        });
      }

      await user.update({ is_active: isActive });

      // cerramos todas las sesiones activas al desactivar el usuario
      if (!isActive) {
        await UserSession.destroy({ where: { user_id: id } });
      }

      res.json({
        success: true,
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          user: {
            id: user.id,
            username: user.username,
            isActive: user.is_active
          }
        }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // eliminar usuario
  deleteUser: async (req, res) => {
    let t;
    try {
      t = await sequelize.transaction();
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const user = await User.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        transaction: t
      });
      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (id === req.user.id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      // anonimizamos los campos únicos y desactivamos antes del soft-delete
      await user.update({
        email: `deleted+${user.id}@deleted.local`,
        username: `deleted_${user.id.slice(0, 8)}`,
        is_active: false
      }, { transaction: t });

      // cerramos sesiones activas, limpiamos roles y membresías, y hacemos soft-delete
      await Promise.all([
        UserRole.destroy({ where: { user_id: id }, transaction: t }),
        UserSession.destroy({ where: { user_id: id }, transaction: t }),
        UserStore.destroy({ where: { user_id: id }, transaction: t }),
        user.destroy({ transaction: t })
      ]);

      await t.commit();

      sendDeletionEmail(user).catch(err => console.error('Error sending deletion email:', err));

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      if (t) await t.rollback();
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  getUserPermissions: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const permissions = await UserPermission.getForUser(req.params.id, storeId);
      res.json({ success: true, data: { permissions } });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  updateUserPermissions: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ success: false, message: 'permissions debe ser un objeto' });
      }

      // comprobamos que el usuario objetivo pertenece a este tenant
      const targetUser = await User.findOne({ where: { id: req.params.id, store_id: storeId } });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado en esta tienda' });
      }

      // solo permitimos las claves que son módulos válidos
      const validKeys = ['products','gallery','orders','customers','analytics','sustainability','reports','invoices','tickets','certifications'];
      const sanitized = {};
      for (const key of validKeys) {
        if (key in permissions) sanitized[key] = Boolean(permissions[key]);
      }

      const existing = await UserPermission.findOne({ where: { user_id: req.params.id, store_id: storeId } });
      if (existing) {
        await existing.update({ permissions: sanitized });
      } else {
        await UserPermission.create({ user_id: req.params.id, store_id: storeId, permissions: sanitized });
      }

      res.json({ success: true, data: { permissions: sanitized } });
    } catch (error) {
      console.error('Update user permissions error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
};

module.exports = { userController };