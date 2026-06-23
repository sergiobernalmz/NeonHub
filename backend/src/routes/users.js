const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, requireUserCreatePermission, requireAdmin, requireRoleLevel } = require('../middleware/auth');
const { userController } = require('../controllers/userController');

const router = express.Router();

// Validation rules - Simplificadas para ser más fáciles de usar
const createUserValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Nombre de usuario: entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Nombre de usuario: solo letras, números y guiones bajos (_)'),
  body('email')
    .isEmail()
    .withMessage('Email: formato inválido (ejemplo: usuario@dominio.com)')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nombre: entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'\-\.]+$/)
    .withMessage('Nombre: caracteres no válidos'),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Apellido: entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'\-\.]+$/)
    .withMessage('Apellido: caracteres no válidos')
];

const updateUserValidation = [
  param('id').isUUID().withMessage('ID de usuario inválido'),
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe ser un email válido')
];

router.get('/profile', authenticateToken, userController.getMyProfile);

router.put('/profile', authenticateToken, userController.updateMyProfile);

router.get('/', authenticateToken, requireRoleLevel(60), userController.getAllUsers);

router.get('/roles', authenticateToken, requireRoleLevel(60), userController.getAllRoles);

router.get('/:id', authenticateToken, requireRoleLevel(60), userController.getUserById);

router.post('/', authenticateToken, requireUserCreatePermission, createUserValidation, userController.createUser);

router.put('/:id', authenticateToken, requireAdmin, updateUserValidation, userController.updateUser);

router.patch('/:id/role', authenticateToken, requireAdmin, userController.updateUserRole);

router.patch('/:id/status', authenticateToken, requireAdmin, userController.updateUserStatus);

router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

router.get('/:id/permissions', authenticateToken, requireRoleLevel(80), userController.getUserPermissions);

router.patch('/:id/permissions', authenticateToken, requireRoleLevel(80), userController.updateUserPermissions);

module.exports = router;