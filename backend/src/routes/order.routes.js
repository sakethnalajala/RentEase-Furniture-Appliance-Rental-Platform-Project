const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/order.controller');
const { checkoutSchema } = require('../validators/order.validator');

const router = express.Router();
router.use(authenticate);

// Customer
router.get('/demo-upi-qr', authorize(ROLES.CUSTOMER), ctrl.getDemoUpiQr);
router.post('/checkout', authorize(ROLES.CUSTOMER), validate(checkoutSchema), ctrl.checkout);
router.get('/my', authorize(ROLES.CUSTOMER), ctrl.listMyOrders);
router.get('/my/items', authorize(ROLES.CUSTOMER), ctrl.listMyOrderItems);
router.get('/my/payments', authorize(ROLES.CUSTOMER), ctrl.listMyPayments);
router.get('/:id', authorize(ROLES.CUSTOMER), ctrl.getOrder);
router.post('/items/:itemId/cancel', authorize(ROLES.CUSTOMER), ctrl.cancelOrderItem);

// Vendor — view-only: there is no vendor approval step in this app (see order.controller.js's
// checkout — every order is automatically confirmed the moment payment succeeds), so the only
// vendor-facing order route is the read-only list below.
router.get('/vendor/my', authorize(ROLES.VENDOR), ctrl.listVendorOrderItems);

module.exports = router;
