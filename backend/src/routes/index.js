const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const dashboardRoutes = require('./dashboard');
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const orderRoutes = require('./orders');
const publicOrderRoutes = require('./publicOrders');
const returnsRoutes = require('./returns');
const publicRoutes = require('./public');
const uploadRoutes = require('./uploads');
const customerRoutes = require('./customers');
const notificationRoutes = require('./notifications');
const reportRoutes = require('./reports');
const cartRoutes = require('./cart');
const sustainabilityRoutes = require('./sustainability');
const certificationRoutes = require('./certifications');
const ingestRoutes = require('./ingestRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const adminRoutes = require('./adminRoutes');
const ticketsRoutes  = require('./tickets');
const invoiceRoutes  = require('./invoices');
const paymentRoutes  = require('./payments');
const billingRoutes  = require('./billing');
const storeRoutes    = require('./store');
const onboardingRoutes = require('./onboarding');
const contactRoutes    = require('./contact');
const discountRoutes   = require('./discounts');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'EcoCommerce API',
      description: 'API para sistema de comercio electrónico sostenible',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        dashboard: '/api/dashboard',
        products: '/api/products',
        categories: '/api/categories',
        orders: '/api/orders',
        customers: '/api/customers',
        notifications: '/api/notifications',
        reports: '/api/reports',
        sustainability: '/api/sustainability',
        certifications: '/api/certifications',
        uploads: '/api/uploads'
      },
      documentation: {
        swagger: '/api/docs',
        postman: '/api/postman'
      }
    }
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/cart', cartRoutes);
router.use('/sustainability', sustainabilityRoutes);
router.use('/certifications', certificationRoutes);
router.use('/public/orders', publicOrderRoutes);
router.use('/returns', returnsRoutes);
router.use('/public', publicRoutes);
router.use('/uploads', uploadRoutes);
router.use('/ingest', ingestRoutes);
router.use('/admin', auditLogRoutes);
router.use('/admin', adminRoutes);

router.use('/tickets',  ticketsRoutes);
router.use('/invoices', invoiceRoutes);

router.use('/payments', paymentRoutes);
router.use('/billing', billingRoutes);
router.use('/store', storeRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/contact',   contactRoutes);
router.use('/discounts', discountRoutes);

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;