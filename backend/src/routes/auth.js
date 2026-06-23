const express = require('express');
const { body } = require('express-validator');
const { authController, authLimiter, requireServiceApiKey, unverifiedUsersController, myStoresController, myTenantsController, switchActiveStoreController, generateSsoToken, exchangeSsoToken, requestPasswordChangeController, completePasswordChangeController, unlockAccountController, syncPasswordController } = require('../controllers/authController');
const { authenticateToken, requireUserCreatePermission } = require('../middleware/auth');
const { auditAction } = require('../middleware/auditMiddleware');
const { User, UserSession } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial'),
  body('firstName')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  body('lastName')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El apellido solo puede contener letras y espacios')
];

const loginValidation = [
  body('login')
    .notEmpty()
    .withMessage('El usuario o email es requerido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

router.post('/register', authenticateToken, requireUserCreatePermission, registerValidation, authController.register);

router.get('/check-username', authController.checkUsername);

router.post('/login', authLimiter, loginValidation, auditAction('auth', 'login'), authController.login);

router.post('/demo', authLimiter, authController.demoLogin);

router.post('/refresh', authController.refresh);

router.post('/verify-email', authLimiter, authController.verifyEmail);

router.post('/logout', authController.logout);

router.put('/profile', authenticateToken, authController.updateProfile);

router.post('/forgot-password', authLimiter, authController.forgotPassword);

router.post('/reset-password', authLimiter, authController.resetPassword);

router.put('/change-password', authenticateToken, authController.changePassword);

router.get('/profile', authenticateToken, authController.profile);

router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      }
    }
  });
});

router.get('/unverified-users', requireServiceApiKey, unverifiedUsersController);

router.get('/my-stores', authenticateToken, myStoresController);
router.get('/my-tenants', authenticateToken, myTenantsController);
router.patch('/active-store', authenticateToken, switchActiveStoreController);

router.post('/sso-token', generateSsoToken);

router.post('/sso-exchange', exchangeSsoToken);

router.post('/activate', authLimiter, authController.activateAccount);

router.post('/request-password-change', authenticateToken, requestPasswordChangeController);

router.post('/complete-password-change', authLimiter, completePasswordChangeController);

router.post('/unlock-account', authLimiter, unlockAccountController);

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['preferences'] });
    res.json({ success: true, data: user?.preferences || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener preferencias' });
  }
});

router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const current = user.preferences || {};
    const updated = {
      ...current,
      ...req.body,
      notifications: {
        ...(current.notifications || {}),
        ...(req.body.notifications || {})
      }
    };
    await user.update({ preferences: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar preferencias' });
  }
});

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await UserSession.getActiveSessions(req.user.id);
    const currentHash = req.cookies.refreshToken
      ? UserSession.hashToken(req.cookies.refreshToken)
      : null;
    const result = sessions.map(s => ({
      id:          s.id,
      device_name: s.device_name,
      browser:     s.browser,
      os:          s.os,
      ip_address:  s.ip_address,
      last_active: s.last_active,
      created_at:  s.created_at,
      is_current:  s.refresh_token_hash === currentHash
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener sesiones' });
  }
});

router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await UserSession.findOne({
      where: { id: req.params.sessionId, user_id: req.user.id }
    });
    if (!session) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

    const currentHash = req.cookies.refreshToken
      ? UserSession.hashToken(req.cookies.refreshToken)
      : null;
    if (session.refresh_token_hash === currentHash) {
      return res.status(400).json({ success: false, message: 'Para cerrar la sesión actual usa el botón de logout' });
    }
    await session.destroy();
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al revocar sesión' });
  }
});

router.delete('/sessions', authenticateToken, async (req, res) => {
  try {
    const currentHash = req.cookies.refreshToken
      ? UserSession.hashToken(req.cookies.refreshToken)
      : null;
    await UserSession.destroy({
      where: {
        user_id: req.user.id,
        ...(currentHash ? { refresh_token_hash: { [Op.ne]: currentHash } } : {})
      }
    });
    res.json({ success: true, message: 'Otras sesiones cerradas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al revocar sesiones' });
  }
});

router.post('/sync-password', syncPasswordController);

module.exports = router;