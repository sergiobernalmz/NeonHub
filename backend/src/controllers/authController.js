const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { User, Role, Store, UserStore, SsoToken, ActivationToken, UserPermission, ProvisioningJob, PasswordChangeToken, AuditLog, UserSession, sequelize } = require('../models');
const UAParser = require('ua-parser-js');

const parseUserAgent = (uaString) => {
  const parser = new UAParser(uaString || '');
  const browser = parser.getBrowser();
  const os      = parser.getOS();
  const device  = parser.getDevice();
  const deviceType = device.type || 'desktop';
  return {
    browser:     `${browser.name || 'Navegador'}${browser.version ? ' ' + browser.version.split('.')[0] : ''}`.trim(),
    os:          `${os.name || 'SO desconocido'}${os.version ? ' ' + os.version : ''}`.trim(),
    device_name: deviceType === 'mobile'  ? (`${device.vendor || ''} ${device.model || ''}`.trim() || 'Móvil')
               : deviceType === 'tablet'  ? 'Tablet'
               : 'Ordenador'
  };
};
const { getLandingPool } = require('../config/landingDb');
const axios = require('axios');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const validator = require('validator');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// Limitar peticiones en endpoints de autenticacion
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión, intenta de nuevo más tarde',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
  skip: (req) => {
    const trustedIPs = ['127.0.0.1', '::1'];
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    return trustedIPs.includes(clientIP);
  }
});

const generateTokens = (user, extraPayload = {}) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured');
  }

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    store_id: user.store_id || null,
    ...extraPayload
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '1h'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });

  return { accessToken, refreshToken };
};

const authController = {
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const { username, email, password, firstName, lastName, phone, roleId } = req.body;

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El usuario o email ya existe'
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await User.create({
        username,
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        store_id: req.user?.storeId || req.tenant?.id || null,
        is_active: true,
        email_verified: true
      });

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
        await user.addRole(assignedRole);
      }

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: assignedRole ? {
              id: assignedRole.id,
              name: assignedRole.name,
              displayName: assignedRole.display_name
            } : null
          }
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const { login, password } = req.body;

      const isOnTenantSubdomain = req.tenant && req.tenant.id;

      const baseDomain = (process.env.TENANT_BASE_DOMAIN || 'neonhub.es').toLowerCase();
      const host = (req.headers.host || req.hostname || '').split(':')[0].toLowerCase().trim();
      const isSubdomainRequest = host.endsWith(baseDomain) && host !== baseDomain && host !== `api.${baseDomain}`;
      if (isSubdomainRequest && !req.tenant) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const loginWhere = { [Op.or]: [{ email: login }, { username: login }] };

      // MODELO B: los roles se resuelven POR TIENDA. Si entramos por el subdominio
      // de una tienda, solo traemos los roles asignados a esa tienda (user_roles.store_id),
      // más los roles de plataforma/superadmin (store_id NULL) que aplican globalmente.
      // Así un mismo usuario puede ser CEO en una tienda y empleado en otra.
      const roleThroughWhere = { is_active: true };
      if (req.tenant && req.tenant.id) {
        roleThroughWhere[Op.or] = [
          { store_id: req.tenant.id },
          { store_id: null }
        ];
      }
      const includeRoles = [{ model: Role, as: 'roles', required: false, through: { where: roleThroughWhere } }];

      let user = null;
      if (isOnTenantSubdomain) {
        user = await User.scope('withPassword').findOne({
          where: loginWhere,
          include: [
            ...includeRoles,
            {
              model: UserStore,
              as: 'userStores',
              required: true,
              where: { store_id: req.tenant.id }
            }
          ]
        });
      }
      if (!user) {
        user = await User.scope('withPassword').findOne({
          where: loginWhere,
          include: [
            ...includeRoles,
            {
              model: UserStore,
              as: 'userStores',
              required: false
            }
          ]
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const isPrivileged = user.roles && user.roles.some(r => r.name === 'superadmin' || r.scope === 'platform');

      if (isOnTenantSubdomain && !isPrivileged) {
        const belongsToStore = user.userStores?.some(us => us.store_id === req.tenant.id);
        const legacyBelongs  = user.store_id === req.tenant.id;
        if (!belongsToStore && !legacyBelongs) {
          return res.status(401).json({
            success: false,
            message: 'Credenciales inválidas'
          });
        }
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada'
        });
      }

      if (user.email_verified === false) {
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu correo electrónico antes de iniciar sesión',
          error: {
            code: 'EMAIL_NOT_VERIFIED'
          }
        });
      }

      if (user.locked_until && user.locked_until > new Date()) {
        const remainingMs = new Date(user.locked_until).getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return res.status(423).json({
          success: false,
          message: `Cuenta bloqueada temporalmente. Inténtalo de nuevo en ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''} o revisa tu email para desbloquearla.`,
          remaining_minutes: remainingMinutes
        });
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        const { justLocked, lockedUntil } = await user.incrementLoginAttempts();

        if (justLocked) {
          // Notify user by email and alert security channel
          const userStore = await UserStore.findOne({ where: { user_id: user.id } });
          if (userStore) {
            try {
              const unlockToken = await ActivationToken.createForUser(user.id, userStore.store_id, 'unlock', 24);
              const landingUrl = (process.env.LANDING_URL || 'https://neonhub.es').replace(/\/$/, '');
              const unlockUrl = `${landingUrl}/auth/unlock-account?token=${unlockToken.token}`;
              const webhookUrl = process.env.N8N_ACCOUNT_BLOCKED_WEBHOOK;
              if (webhookUrl) {
                axios.post(webhookUrl, {
                  email: user.email,
                  username: user.username || user.email,
                  unlock_url: unlockUrl,
                  locked_until: lockedUntil,
                  ip: req.ip || req.headers['x-forwarded-for'] || 'desconocida'
                }).catch(e => console.error('[auth] account-blocked webhook error:', e.message));
              }
            } catch (e) {
              console.error('[auth] unlock token generation error:', e.message);
            }
          }
          const remainingMinutes = 120;
          return res.status(423).json({
            success: false,
            message: `Cuenta bloqueada por demasiados intentos fallidos. Revisa tu email para desbloquearla o inténtalo de nuevo en ${remainingMinutes} minutos.`,
            remaining_minutes: remainingMinutes
          });
        }

        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      await user.update({
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date()
      });

      const isSuperAdmin = user.roles && user.roles.some(r => r.name === 'superadmin' || r.scope === 'platform');
      const isProxyMode = isSuperAdmin && !!req.tenant;

      if (isProxyMode) {
        try {
          await AuditLog.create({
            user_id: user.id,
            store_id: req.tenant.id,
            action: 'login',
            resource_type: 'store',
            resource_id: req.tenant.id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            description: `SuperAdmin proxy: ${user.email} accedió a la tienda ${req.tenant.subdomain}`,
            metadata: {
              proxy_mode: true,
              superadmin_email: user.email,
              target_store: req.tenant.subdomain,
              target_store_id: req.tenant.id
            }
          });
        } catch (auditErr) {
          console.error('[AUDIT] Error creating proxy login audit log:', auditErr.message);
        }
        console.warn(`[SECURITY] SuperAdmin ${user.email} proxy login → store ${req.tenant.subdomain}`);
      }

      const proxyExtra = isProxyMode
        ? { isSuperAdminProxy: true, proxyStoreId: req.tenant.id }
        : {};

      const { accessToken, refreshToken } = generateTokens(user, proxyExtra);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days (matches JWT_REFRESH_EXPIRE)
      });

      try {
        const { browser, os, device_name } = parseUserAgent(req.headers['user-agent']);
        await UserSession.createSession(user.id, refreshToken, {
          device_name,
          browser,
          os,
          ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      } catch (sessionErr) {
        console.error('[SESSION] Error saving session for user', user.id, ':', sessionErr.message, sessionErr.original?.code || '');
      }

      const userPermissions = req.tenant?.id
        ? await UserPermission.getForUser(user.id, req.tenant.id)
        : {};

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            theme_preference: user.theme_preference || 'dark',
            roles: user.roles ? user.roles.map(role => ({
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              permissions: role.permissions,
              level: role.level
            })) : [],
            userPermissions,
            ...(isProxyMode && { isSuperAdminProxy: true, proxyStoreId: req.tenant.id })
          },
          accessToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  demoLogin: async (req, res) => {
    try {
      let demoUser = await User.scope('withPassword').findOne({
        where: { username: 'demo' },
        include: [{
          model: Role,
          as: 'roles',
          through: {
            where: { is_active: true }
          }
        }]
      });

      if (!demoUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario demo no configurado en el sistema'
        });
      }

      const { accessToken } = generateTokens(demoUser);

      res.json({
        success: true,
        message: 'Inicio de sesión demo exitoso',
        data: {
          user: {
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            firstName: demoUser.first_name,
            lastName: demoUser.last_name,
            roles: demoUser.roles ? demoUser.roles.map(role => ({
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              permissions: role.permissions,
              level: role.level
            })) : []
          },
          accessToken
        }
      });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno conectando a demo'
      });
    }
  },

  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Token de actualización no encontrado'
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await User.findByPk(decoded.id, {
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] }
        }]
      });

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido'
        });
      }

      const session = await UserSession.findByTokenHash(refreshToken);
      if (!session) {
        res.clearCookie('refreshToken');
        return res.status(401).json({ success: false, message: 'Sesión revocada' });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      await session.update({
        refresh_token_hash: UserSession.hashToken(newRefreshToken),
        last_active: new Date()
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: 'Token actualizado exitosamente',
        data: {
          accessToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Token de actualización inválido'
      });
    }
  },

  logout: async (req, res) => {
    try {
      const { refreshToken } = req.cookies;
      if (refreshToken) {
        await UserSession.destroy({ where: { refresh_token_hash: UserSession.hashToken(refreshToken) } });
      }
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Sesión cerrada exitosamente' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  profile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] }
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
            avatarUrl: user.avatar_url,
            emailVerified: user.email_verified,
            preferences: user.preferences,
            lastLoginAt: user.last_login_at,
            roles: user.roles.map(role => ({
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              permissions: role.permissions
            }))
          }
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const userId = req.user.id;
      const sanitizeName = (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/<[^>]*>/g, '').trim();
      };

      if (email && email !== req.user.email) {
        const storeFilter = req.user.storeId ? { store_id: req.user.storeId } : {};
        const existingUser = await User.findOne({
          where: { email, id: { [Op.ne]: userId }, ...storeFilter }
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'El email ya está en uso en esta tienda'
          });
        }
      }

      const updateData = {};
      if (firstName !== undefined) updateData.first_name = firstName ? sanitizeName(firstName) : null;
      if (lastName !== undefined) updateData.last_name = lastName ? sanitizeName(lastName) : null;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone || null;

      await User.update(updateData, { where: { id: userId }, returning: true });

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
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
      console.error('Update profile error:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual y nueva son requeridas'
        });
      }

      if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden'
        });
      }

      const user = await User.scope('withPassword').findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 8 caracteres'
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await User.update(
        { password_hash: hashedPassword },
        { where: { id: userId } }
      );

      // Sync to landing_db
      try {
        const pool = getLandingPool();
        if (pool) {
          const landingHash = await bcrypt.hash(newPassword, 12);
          await pool.query('UPDATE users SET password = $1 WHERE email = $2', [landingHash, user.email]);
        }
      } catch (landingErr) {
        console.error('[changePassword] landing_db sync failed for', user.email, ':', landingErr.message);
      }

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  checkUsername: async (req, res) => {
    try {
      const username = String(req.query.username || '').trim();
      if (!username || username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ success: false, available: false, message: 'Nombre de usuario inválido' });
      }
      const existing = await User.findOne({ where: { username } });
      return res.json({ success: true, available: !existing });
    } catch (error) {
      console.error('checkUsername error:', error);
      return res.status(500).json({ success: false, available: false, message: 'Error interno del servidor' });
    }
  },

  publicRegister: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const storeId = req.tenant?.id;
      if (!storeId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Contexto de tienda requerido para el registro'
        });
      }

      const { username, email, password, first_name, last_name, plan } = req.body;

      const existingByEmail = await User.findOne({
        where: { email, store_id: storeId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existingByEmail) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Este email ya está registrado en esta tienda',
          field: 'email'
        });
      }

      const existingByUsername = await User.findOne({
        where: { username },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existingByUsername) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Este nombre de usuario ya está en uso',
          field: 'username'
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const userData = {
        username,
        email,
        password_hash: hashedPassword,
        first_name,
        last_name,
        store_id: storeId,
        is_active: true,
        email_verified: false,
        preferences: {
          theme: 'dark',
          language: 'es',
          pending_plan: plan || null,
          onboarding_status: plan ? 'pending_payment' : 'completed'
        }
      };

      const newUser = await User.create(userData, { transaction });

      const customerRole = await Role.findOne({ where: { name: 'customer' }, transaction }) ||
        await Role.findOne({ where: { name: 'user' }, transaction }) ||
        await Role.findByPk(3, { transaction });

      if (customerRole) {
        await newUser.addRole(customerRole, { transaction });
      }

      await UserStore.create(
        { user_id: newUser.id, store_id: storeId },
        { transaction }
      );

      await transaction.commit();

      try {
        const activationToken = await ActivationToken.createForUser(
          newUser.id,
          storeId,
          'customer_verification',
          24
        );

        const webhookUrl = process.env.N8N_CUSTOMER_VERIFICATION_WEBHOOK;
        if (webhookUrl) {
          const baseDomain = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';
          const verificationUrl = `https://${req.tenant.subdomain}.${baseDomain}/shop/verify?token=${activationToken.token}`;
          await axios.post(webhookUrl, {
            email: newUser.email,
            username: newUser.username,
            store_name: req.tenant.name,
            store_subdomain: req.tenant.subdomain,
            type: 'customer_verification',
            token: activationToken.token,
            verification_url: verificationUrl,
            expires_hours: 24
          }, { timeout: 8000 });
        }
      } catch (webhookErr) {
        console.error('[publicRegister] Verification webhook failed:', webhookErr.message);
      }

      res.status(201).json({
        success: true,
        message: 'Revisa tu email para verificar tu cuenta.',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name
          },
          requiresVerification: true
        }
      });
    } catch (error) {
      console.error('Public registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token de verificación requerido'
        });
      }

      let user;
      if (req.tenant?.id) {
        const rows = await sequelize.query(
          `SELECT u.* FROM users u
           JOIN user_stores us ON us.user_id = u.id
           WHERE u.verification_token = :token
             AND u.email_verified = false
             AND us.store_id = :storeId
           LIMIT 1`,
          { replacements: { token, storeId: req.tenant.id }, type: sequelize.QueryTypes.SELECT }
        );
        user = rows[0] ? await User.findByPk(rows[0].id) : null;
      } else {
        user = await User.findOne({ where: { verification_token: token, email_verified: false } });
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token inválido o cuenta ya verificada'
        });
      }

      if (user.verification_token_expires && user.verification_token_expires < new Date()) {
        await user.update({ verification_token: null, verification_token_expires: null });
        return res.status(400).json({
          success: false,
          message: 'El enlace de verificación ha caducado. Solicita uno nuevo.'
        });
      }

      await user.update({
        email_verified: true,
        email_verified_at: new Date(),
        verification_token: null,
        verification_token_expires: null
      });

      if (!user.store_id) {
        const pendingJob = await ProvisioningJob.findOne({
          where: { status: 'completed' },
          order: [['created_at', 'DESC']]
        }).then(async (job) => {
          if (!job) return null;
          const email = job.payload?.owner_email;
          return email === user.email ? job : null;
        }).catch(() => null);

        if (pendingJob?.store_id) {
          await user.update({ store_id: pendingJob.store_id }).catch(() => {});
        }
      }

      res.json({
        success: true,
        message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'El email es requerido'
        });
      }

      const genericResponse = res.json.bind(res, {
        success: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación en breve.'
      });

      let user;
      if (req.tenant?.id) {
        user = await User.findOne({
          where: { email },
          include: [{
            model: UserStore,
            as: 'userStores',
            required: true,
            where: { store_id: req.tenant.id }
          }]
        });
      } else {
        user = await User.findOne({ where: { email } });
      }

      if (!user || !user.is_active) {
        if (!req.tenant?.id) {
          try {
            const landingPool = getLandingPool();
            if (landingPool) {
              const { rows } = await landingPool.query(
                'SELECT id, email, username, email_verified FROM users WHERE email = $1 LIMIT 1',
                [email]
              );
              if (rows[0] && rows[0].email_verified) {
                const landingUser = rows[0];
                const resetToken = crypto.randomBytes(32).toString('hex');
                const resetExpires = Date.now() + 60 * 60 * 1000; // bigint ms
                await landingPool.query(
                  'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
                  [resetToken, resetExpires, landingUser.id]
                );
                sendPasswordResetEmail(
                  { email: landingUser.email, username: landingUser.username, first_name: null },
                  resetToken
                ).catch(err => console.error('[forgotPassword] landing email error:', err.message));
              }
            }
          } catch (landingErr) {
            console.error('[forgotPassword] landing_db fallback error:', landingErr.message);
          }
        }
        return genericResponse();
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires
      });

      const resetLink = req.tenant
        ? `https://${req.tenant.subdomain}.neonhub.es/reset-password?token=${resetToken}`
        : `${process.env.FRONTEND_URL || 'https://neonhub.es'}/reset-password?token=${resetToken}`;

      if (req.tenant && process.env.N8N_PASSWORD_RESET_SHOP_WEBHOOK) {
        const store = req.tenant.store || req.tenant;
        const branding = store.settings?.branding || {};
        axios.post(process.env.N8N_PASSWORD_RESET_SHOP_WEBHOOK, {
          customer_email: user.email,
          customer_name: user.first_name || user.username,
          store_name: req.tenant.name,
          store_subdomain: req.tenant.subdomain,
          store_logo: branding.logo_url || null,
          primary_color: branding.primary_color || '#6366f1',
          reset_link: resetLink
        }).catch(err => console.error('n8n password-reset-shop error:', err.message));
      } else {
        sendPasswordResetEmail(user, resetToken)
          .catch(err => console.error('Password reset email error:', err));
      }

      return genericResponse();
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token y nueva contraseña son requeridos'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres'
        });
      }

      const user = await User.findOne({
        where: {
          password_reset_token: token,
          password_reset_expires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        try {
          const landingPool = getLandingPool();
          if (landingPool) {
            const { rows } = await landingPool.query(
              'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > $2',
              [token, Date.now()]
            );
            if (rows[0]) {
              const landingHash = await bcrypt.hash(password, 12);
              await landingPool.query(
                'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
                [landingHash, rows[0].id]
              );
              return res.json({ success: true, message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
            }
          }
        } catch (landingErr) {
          console.error('[resetPassword] landing_db fallback error:', landingErr.message);
        }
        return res.status(400).json({
          success: false,
          message: 'El enlace de recuperación es inválido o ha caducado.'
        });
      }

      if (req.tenant?.id) {
        const inStore = await UserStore.findOne({
          where: { user_id: user.id, store_id: req.tenant.id }
        });
        if (!inStore && user.store_id !== req.tenant.id) {
          return res.status(400).json({
            success: false,
            message: 'El enlace de recuperación es inválido o ha caducado.'
          });
        }
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await user.update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        login_attempts: 0,
        locked_until: null
      });

      // Sync to landing_db
      try {
        const pool = getLandingPool();
        if (pool) {
          const landingHash = await bcrypt.hash(password, 12);
          await pool.query('UPDATE users SET password = $1 WHERE email = $2', [landingHash, user.email]);
        }
      } catch (landingErr) {
        console.error('[resetPassword] landing_db sync failed for', user.email, ':', landingErr.message);
      }

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  verifyCustomerEmail: async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token requerido' });
      }

      const activationToken = await ActivationToken.findValid(token);
      if (!activationToken || activationToken.type !== 'customer_verification') {
        return res.status(400).json({
          success: false,
          message: 'El enlace de verificación es inválido o ha caducado.'
        });
      }

      const user = await User.findByPk(activationToken.user_id);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
      }

      await user.update({
        email_verified: true,
        email_verified_at: new Date()
      });
      await activationToken.update({ used: true });

      res.json({ success: true, message: 'Email verificado correctamente. Ya puedes comprar en la tienda.' });
    } catch (error) {
      console.error('Verify customer email error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  activateAccount: async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token y contraseña son requeridos'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres'
        });
      }

      const activationToken = await ActivationToken.findValid(token);
      if (!activationToken) {
        return res.status(400).json({
          success: false,
          message: 'El enlace de activación es inválido o ha caducado.'
        });
      }

      const user = await User.findByPk(activationToken.user_id);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await user.update({
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true,
        email_verified_at: new Date()
      });

      await activationToken.update({ used: true });

      // Sync to landing_db
      try {
        const pool = getLandingPool();
        if (pool) {
          const landingHash = await bcrypt.hash(password, 12);
          await pool.query('UPDATE users SET password = $1 WHERE email = $2', [landingHash, user.email]);
        }
      } catch (landingErr) {
        console.error('[activateAccount] landing_db sync failed:', landingErr.message);
      }

      res.json({
        success: true,
        message: 'Cuenta activada correctamente. Ya puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Activate account error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  requestPasswordChange: async (req, res) => {
    try {
      const email = req.user.email;
      const origin = 'dashboard';

      await PasswordChangeToken.update(
        { used: true },
        { where: { email, origin, used: false } }
      );

      const pct = await PasswordChangeToken.create(email, origin);

      const frontendUrl = process.env.FRONTEND_URL || 'https://neonhub.es';
      const subdomain = req.tenant?.subdomain || '';
      const changeUrl = `${frontendUrl}/reset-password?token=${pct.token}&source=change${subdomain ? '&subdomain=' + subdomain : ''}`;

      let store_name = 'NeonHub';
      if (req.user.storeId) {
        try {
          const store = await Store.findByPk(req.user.storeId, { attributes: ['name'] });
          if (store) store_name = store.name;
        } catch (_e) {}
      }

      const webhookUrl = process.env.N8N_PASSWORD_CHANGE_WEBHOOK;
      if (webhookUrl) {
        await axios.post(webhookUrl, {
          email,
          username: req.user.firstName
            ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
            : req.user.username,
          store_name,
          change_url: changeUrl,
          expires_hours: 1
        }, { timeout: 8000 });
      }

      res.json({
        success: true,
        message: 'Te hemos enviado un enlace para cambiar tu contraseña. Revisa tu email.'
      });
    } catch (error) {
      console.error('requestPasswordChange error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  completePasswordChange: async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Datos inválidos.' });
      }

      const pct = await PasswordChangeToken.findValid(token);
      if (!pct) {
        return res.status(400).json({
          success: false,
          message: 'El enlace es inválido o ha caducado.'
        });
      }

      const email = pct.email;

      const neonUser = await User.findOne({ where: { email } });
      if (neonUser) {
        const hashed = await bcrypt.hash(password, 12);
        await neonUser.update({
          password_hash: hashed,
          login_attempts: 0,
          locked_until: null
        });
      }

      try {
        const pool = getLandingPool();
        const landingHash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password = $1 WHERE email = $2', [landingHash, email]);
      } catch (landingErr) {
        console.error('[completePasswordChange] landing_db update failed for', email, ':', landingErr.message);
      }

      await PasswordChangeToken.markUsed(token);

      res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      console.error('completePasswordChange error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
};

const requireServiceApiKey = (req, res, next) => {
  const key = req.headers['x-service-api-key'];
  const expected = process.env.SERVICE_API_KEY;
  if (!expected) {
    return res.status(500).json({ success: false, message: 'Servidor mal configurado: SERVICE_API_KEY no definida' });
  }
  if (!key || key !== expected) {
    return res.status(401).json({ success: false, message: 'API key requerida o inválida' });
  }
  next();
};

const unverifiedUsersController = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const users = await User.findAll({
      where: {
        email_verified: false,
        created_at: { [Op.lt]: cutoff }
      },
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        created_at: u.createdAt || u.dataValues?.created_at || null,
        store_id: u.store_id || null
      }))
    });
  } catch (error) {
    console.error('Unverified users error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const myStoresController = async (req, res) => {
  try {
    const { UserStore } = require('../models');

    const userStores = await UserStore.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Store, as: 'store', attributes: ['id', 'name', 'subdomain', 'is_active', 'plan_id', 'payment_status'] }],
      order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: userStores.map(us => ({
        id: us.store.id,
        name: us.store.name,
        subdomain: us.store.subdomain,
        is_active: us.store.is_active,
        plan_id: us.store.plan_id,
        payment_status: us.store.payment_status,
        is_primary: us.is_primary,
        is_current: us.store.id === req.user.storeId,
        url: `https://${us.store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`
      }))
    });
  } catch (error) {
    console.error('my-stores error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const switchActiveStoreController = async (req, res) => {
  try {
    const { store_id } = req.body;
    const { UserStore } = require('../models');

    if (!store_id) {
      return res.status(400).json({ success: false, message: 'store_id es obligatorio' });
    }

    const membership = await UserStore.findOne({
      where: { user_id: req.user.id, store_id },
      include: [{ model: Store, as: 'store', attributes: ['id', 'name', 'subdomain', 'is_active'] }]
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a esta tienda' });
    }

    if (!membership.store.is_active) {
      return res.status(403).json({ success: false, message: 'La tienda está inactiva' });
    }

    await User.update({ store_id }, { where: { id: req.user.id } });

    res.json({
      success: true,
      message: 'Tienda activa actualizada',
      data: {
        store_id: membership.store.id,
        store_name: membership.store.name,
        subdomain: membership.store.subdomain,
        url: `https://${membership.store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`
      }
    });
  } catch (error) {
    console.error('switch-active-store error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const generateSsoToken = async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_API_SECRET) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const { email, subdomain } = req.body;
  if (!email || !subdomain) {
    return res.status(400).json({ success: false, message: 'email y subdomain son obligatorios' });
  }

  try {
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const store = await Store.findOne({ where: { subdomain } });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    }

    // Un usuario de plataforma (scope='platform', p.ej. el rol ceo_neonhub) puede
    // entrar en cualquier tienda sin tener una fila en user_stores — es justamente
    // lo que permite el "proxy" desde el panel admin de la landing. Sin esta
    // excepcion, generateSsoToken devolveria 403 siempre para el superadmin.
    const isPlatformUser = !!(await sequelize.query(
      `SELECT 1 FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = :uid AND ur.is_active = true
         AND (r.scope = 'platform' OR r.name = 'superadmin')
       LIMIT 1`,
      { replacements: { uid: user.id }, type: sequelize.QueryTypes.SELECT }
    )).length > 0;

    const hasAccess = isPlatformUser ||
      user.store_id === store.id ||
      !!(await UserStore.findOne({ where: { user_id: user.id, store_id: store.id } }));

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'El usuario no tiene acceso a esta tienda' });
    }

    await SsoToken.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });

    const token = uuidv4();
    const expires_at = new Date(Date.now() + 30 * 1000);

    await SsoToken.create({ token, user_id: user.id, store_id: store.id, used: false, expires_at });

    return res.json({ success: true, sso_token: token });
  } catch (error) {
    console.error('generateSsoToken error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const exchangeSsoToken = async (req, res) => {
  const { sso_token } = req.body;
  if (!sso_token) {
    return res.status(400).json({ success: false, message: 'sso_token es obligatorio' });
  }

  const t = await sequelize.transaction();
  try {
    await SsoToken.destroy({ where: { expires_at: { [Op.lt]: new Date() } }, transaction: t });

    const record = await SsoToken.findOne({
      where: { token: sso_token, used: false, expires_at: { [Op.gt]: new Date() } },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!record) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Token SSO inválido, expirado o ya utilizado' });
    }

    await record.update({ used: true }, { transaction: t });

    await t.commit();

    const user = await User.findByPk(record.user_id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { where: { is_active: true }, attributes: [] }
      }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Usuario inactivo o no encontrado' });
    }

    const targetStoreId = record.store_id || user.store_id;
    const userForToken = { ...user.toJSON(), store_id: targetStoreId };

    const { accessToken, refreshToken } = generateTokens(userForToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: user.roles ? user.roles.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.display_name,
            permissions: r.permissions,
            level: r.level
          })) : []
        }
      }
    });
  } catch (error) {
    await t.rollback().catch(() => {});
    console.error('exchangeSsoToken error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const myTenantsController = async (req, res) => {
  try {
    const { UserStore } = require('../models');
    const baseDomain = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';
    const userName = req.user.firstName || req.user.username;

    const isSuperAdmin = req.user.roles?.some(r => r.scope === 'platform' || r.level >= 200) || false;

    if (isSuperAdmin) {
      return res.json({
        success: true,
        user: { id: req.user.id, email: req.user.email, name: userName },
        tenants: [],
        isSuperAdmin: true
      });
    }

    const [userStores, roleRows] = await Promise.all([
      UserStore.findAll({
        where: { user_id: req.user.id },
        include: [{
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'subdomain', 'settings'],
          where: { is_active: true },
          required: false
        }],
        order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
      }),
      sequelize.query(
        `SELECT ur.store_id, r.display_name, r.name, r.level
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = :userId AND ur.is_active = true AND r.level >= 40`,
        { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
      )
    ]);

    const roleByStore = {};
    let globalRole = null;
    for (const row of roleRows) {
      if (row.store_id) {
        if (!roleByStore[row.store_id]) roleByStore[row.store_id] = row;
      } else if (!globalRole) {
        globalRole = row;
      }
    }

    const tenants = userStores
      .filter(us => us.store)
      .map(us => {
        const role = roleByStore[us.store.id] || globalRole;
        if (!role) return null;
        return {
          id: us.store.id,
          name: us.store.name,
          subdomain: us.store.subdomain,
          role: role.display_name || role.name,
          level: role.level,
          logo: us.store.settings?.branding?.logo_url || us.store.settings?.branding?.dashboard_logo_url || null,
          primary_color: us.store.settings?.branding?.primary_color || us.store.settings?.colors?.primary || null,
          url: `https://${us.store.subdomain}.${baseDomain}`
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      user: { id: req.user.id, email: req.user.email, name: userName },
      tenants,
      isSuperAdmin: false
    });
  } catch (error) {
    console.error('my-tenants error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const unlockAccountController = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token requerido' });

    const unlockToken = await ActivationToken.findValid(token);
    if (!unlockToken || unlockToken.type !== 'unlock') {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }

    const user = await User.scope('withPassword').findByPk(unlockToken.user_id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await user.resetLoginAttempts();
    await unlockToken.update({ used: true });

    return res.json({ success: true, message: 'Cuenta desbloqueada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[unlockAccount] error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// responde 200 siempre (anti-enumeración)
const syncPasswordController = async (req, res) => {
  res.json({ success: true });

  const { email, password } = req.body;
  if (!email || !password || typeof password !== 'string' || password.length < 8) return;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.warn('[syncPassword] usuario no encontrado en neonhub_db, sync omitido:', email);
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await user.update({ password_hash: hash });
    console.log('[syncPassword] password_hash sincronizado para:', email);
  } catch (err) {
    console.error('[syncPassword] error sincronizando', email, ':', err.message);
  }
};

module.exports = { authController, authLimiter, requireServiceApiKey, unverifiedUsersController, myStoresController, myTenantsController, switchActiveStoreController, generateSsoToken, exchangeSsoToken, requestPasswordChangeController: authController.requestPasswordChange, completePasswordChangeController: authController.completePasswordChange, unlockAccountController, syncPasswordController };
