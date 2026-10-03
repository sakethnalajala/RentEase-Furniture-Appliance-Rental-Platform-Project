const express = require('express');
const ApiResponse = require('../utils/ApiResponse');
const { getDbStatus } = require('../config/db');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const cityRoutes = require('./city.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const wishlistRoutes = require('./wishlist.routes');
const cartRoutes = require('./cart.routes');
const addressRoutes = require('./address.routes');
const adminRoutes = require('./admin.routes');
const vendorRoutes = require('./vendor.routes');
const notificationRoutes = require('./notification.routes');
const orderRoutes = require('./order.routes');
const deliveryRoutes = require('./delivery.routes');
const systemRoutes = require('./system.routes');

const router = express.Router();

// Reports database readiness too (never connection details), so checking
// https://<backend>/api/v1/health right after updating MONGODB_URI shows whether it worked.
router.get('/health', (req, res) => {
  const { ready, lastError, dbName } = getDbStatus();
  const database = ready
    ? { status: 'connected', name: dbName }
    : { status: 'unavailable', name: dbName, code: lastError?.code || 'DB_STARTING', reason: lastError?.message };
  const message = ready ? 'RentEase API is healthy.' : 'RentEase API is running, but the database is unavailable.';
  new ApiResponse(ready ? 200 : 503, { uptime: process.uptime(), database }, message).send(res);
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cities', cityRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/admin', adminRoutes);
router.use('/vendors', vendorRoutes);
router.use('/notifications', notificationRoutes);
router.use('/orders', orderRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/system', systemRoutes);

// Phase 3+: /rental-plans (admin CRUD; the 4 plans are seeded and read via /products/:id for now), /payments, /invoices
// Phase 5+: /maintenance, /damage-reports
// Phase 6+: /commissions, /audit-logs, city/category management
// Phase 7+: /support-tickets, /reviews

module.exports = router;
