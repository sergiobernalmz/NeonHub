const express = require('express')
const productController = require('../controllers/productController')
const categoryController = require('../controllers/categoryController')
const { authController } = require('../controllers/authController')
const { body } = require('express-validator')
const { Store, DiscountCode } = require('../models')

const router = express.Router()

const requireTenantContext = (req, res, next) => {
  if (!req.tenant?.id) {
    return res.status(400).json({
      success: false,
      message: 'Tenant context is required'
    })
  }
  return next()
}

// cosas para validar el registro
const publicRegisterValidation = [
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
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/)
    .withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe contener al menos un número'),
  body('first_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('last_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
]

// mira si la tienda existe y esta activa
router.get('/tenant-check', (req, res) => {
  if (req.tenantInactive) {
    return res.status(403).json({
      success: false,
      exists: true,
      active: false,
      message: req.tenantInactiveReason || 'Tienda desactivada'
    })
  }

  if (!req.tenant?.id) {
    return res.status(404).json({
      success: false,
      exists: false,
      active: false,
      message: 'Tienda no encontrada'
    })
  }

  // Fusionar announcement_text y announcement_color de enterprise_config.design si existen
  const settings = { ...(req.tenant.store.settings || {}) };
  if (settings.enterprise_config && settings.enterprise_config.design) {
    settings.design = {
      ...(settings.design || {}),
      ...settings.enterprise_config.design
    };
  }

  const DEFAULT_FEATURES = {
    products: true, gallery: true, orders: true, customers: true,
    analytics: false, sustainability: false, reports: false,
    invoices: false, tickets: false, certifications: false,
    discounts: false,
  };
  const storeFeatures = { ...DEFAULT_FEATURES, ...(settings.enterprise_config?.features || {}) };

  const store = req.tenant.store;
  const trialEndsAt = store?.trial_ends_at || null;
  const trialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
  const trialDaysTotal = (trialEndsAt && store?.created_at)
    ? Math.ceil((new Date(trialEndsAt) - new Date(store.created_at)) / 86400000)
    : null;

  return res.json({
    success: true,
    exists: true,
    active: true,
    tenant: {
      name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      settings,
      features: storeFeatures,
      plan: store.plan || store.plan_id || 'starter',
      trial_ends_at: trialEndsAt,
      trial_active: trialActive,
      trial_days_total: trialDaysTotal,
      url_mapping: store.url_mapping || null,
    }
  })
})

// rutas de productos para la tienda
router.get('/products', requireTenantContext, productController.getAll)
router.get('/products/:id', requireTenantContext, productController.getById)
router.get('/categories', requireTenantContext, categoryController.getAll)

// ruta para registrarse
router.post('/register', requireTenantContext, publicRegisterValidation, authController.publicRegister)

// ruta para verificar email de cliente
router.post('/verify-email', requireTenantContext, authController.verifyCustomerEmail)

// POST /public/discounts/validate — validar código de descuento sin autenticación
router.post('/discounts/validate', requireTenantContext, async (req, res) => {
  try {
    const { code, order_amount } = req.body
    if (!code) return res.status(400).json({ valid: false, message: 'Código requerido' })

    const discount = await DiscountCode.findOne({
      where: { code: code.toUpperCase().trim(), store_id: req.tenant.id, is_active: true }
    })
    if (!discount) return res.status(404).json({ valid: false, message: 'Código de descuento no válido' })

    if (discount.expires_at && new Date(discount.expires_at) < new Date())
      return res.status(400).json({ valid: false, message: 'Este código ha expirado' })

    if (discount.max_uses && discount.used_count >= discount.max_uses)
      return res.status(400).json({ valid: false, message: 'Este código ha alcanzado su límite de usos' })

    const amount = parseFloat(order_amount) || 0
    if (discount.min_order_amount && amount < parseFloat(discount.min_order_amount))
      return res.status(400).json({ valid: false, message: `Importe mínimo de €${parseFloat(discount.min_order_amount).toFixed(2)} para este código` })

    const discountAmount = discount.type === 'percentage'
      ? (amount * parseFloat(discount.value)) / 100
      : Math.min(parseFloat(discount.value), amount)

    return res.json({
      valid: true,
      discount_id: discount.id,
      code: discount.code,
      type: discount.type,
      value: parseFloat(discount.value),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      message: discount.type === 'percentage'
        ? `${discount.value}% de descuento aplicado`
        : `€${parseFloat(discount.value).toFixed(2)} de descuento aplicado`
    })
  } catch (err) {
    console.error('validate discount error:', err)
    return res.status(500).json({ valid: false, message: 'Error al validar el código' })
  }
})

// GET /public/shipping-config — configuración de envío de la tienda
router.get('/shipping-config', requireTenantContext, async (req, res) => {
  try {
    const store = await Store.findByPk(req.tenant.id, { attributes: ['settings'] })
    if (!store) return res.status(404).json({ message: 'Tienda no encontrada' })
    const features = store.settings?.enterprise_config?.features || {}
    return res.json({
      shipping_cost: features.shipping_cost != null ? parseFloat(features.shipping_cost) : 4.99,
      free_shipping_threshold: features.free_shipping_threshold != null ? parseFloat(features.free_shipping_threshold) : 50,
      free_shipping_disabled: features.free_shipping_disabled || false
    })
  } catch (err) {
    console.error('shipping-config error:', err)
    return res.status(500).json({ message: 'Error al obtener configuración de envío' })
  }
})

module.exports = router