const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/order.controller');
const { checkoutSchema, updateVendorItemStatusSchema } = require('../validators/order.validator');

const router = express.Router();
router.use(authenticate);

// Customer
router.get('/demo-upi-qr', authorize(ROLES.CUSTOMER), ctrl.getDemoUpiQr);
router.post('/checkout', authorize(ROLES.CUSTOMER), validate(checkoutSchema), ctrl.checkout);
router.get('/my', authorize(ROLES.CUSTOMER), ctrl.listMyOrders);
router.get('/my/items', authorize(ROLES.CUSTOMER), ctrl.listMyOrderItems);
router.get('/:id', authorize(ROLES.CUSTOMER), ctrl.getOrder);
router.post('/items/:itemId/cancel', authorize(ROLES.CUSTOMER), ctrl.cancelOrderItem);

// Vendor
router.get('/vendor/my', authorize(ROLES.VENDOR), ctrl.listVendorOrderItems);
router.patch(
  '/vendor/items/:itemId/status',
  authorize(ROLES.VENDOR),
  validate(updateVendorItemStatusSchema),
  ctrl.updateVendorItemStatus
);

module.exports = router;
