const express = require('express');
const ApiResponse = require('../utils/ApiResponse');
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

const router = express.Router();

router.get('/health', (req, res) => {
  new ApiResponse(200, { uptime: process.uptime() }, 'RentEase API is healthy.').send(res);
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

// Phase 3+: /rental-plans (admin CRUD; the 4 plans are seeded and read via /products/:id for now), /payments, /invoices
// Phase 5+: /maintenance, /damage-reports
// Phase 6+: /commissions, /audit-logs, city/category management
// Phase 7+: /support-tickets, /reviews

module.exports = router;
