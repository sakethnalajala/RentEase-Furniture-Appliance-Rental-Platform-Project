const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/admin.controller');
const {
  rejectVendorSchema,
  updateVendorSchema,
  updateDeliveryPartnerSchema,
  createProductSchema,
  updateProductSchema,
  categorySchema,
  rentalPlanSchema,
  updateSettingsSchema,
  broadcastNotificationSchema,
} = require('../validators/admin.validator');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', ctrl.getDashboardStats);
router.get('/analytics', ctrl.adminAnalytics);

// Vendor management
router.get('/vendors', ctrl.listVendors);
router.get('/vendors/:id', ctrl.getVendor);
router.get('/vendors/:id/performance', ctrl.getVendorPerformance);
router.post('/vendors/:id/approve', ctrl.approveVendor);
router.post('/vendors/:id/reject', validate(rejectVendorSchema), ctrl.rejectVendor);
router.post('/vendors/:id/suspend', ctrl.suspendVendor);
router.post('/vendors/:id/reactivate', ctrl.reactivateVendor);
router.patch('/vendors/:id', validate(updateVendorSchema), ctrl.adminUpdateVendor);
router.delete('/vendors/:id', ctrl.adminDeleteVendor);

// Product management
router.get('/products', ctrl.adminListProducts);
router.get('/products/:id', ctrl.adminGetProduct);
router.post('/products', validate(createProductSchema), ctrl.adminCreateProduct);
router.patch('/products/:id', validate(updateProductSchema), ctrl.adminUpdateProduct);
router.patch('/products/:id/approval', ctrl.adminSetProductApproval);
router.delete('/products/:id', ctrl.adminDeleteProduct);

// Category management
router.get('/categories', ctrl.adminListCategories);
router.post('/categories', validate(categorySchema), ctrl.adminCreateCategory);
router.patch('/categories/:id', validate(categorySchema.partial()), ctrl.adminUpdateCategory);
router.delete('/categories/:id', ctrl.adminDeleteCategory);

// Inventory management
router.get('/inventory', ctrl.adminInventoryOverview);

// Customer management
router.get('/customers', ctrl.adminListCustomers);
router.get('/customers/:id', ctrl.adminGetCustomer);

// Delivery partner management
router.get('/delivery-partners', ctrl.adminListDeliveryPartners);
router.get('/delivery-partners/:id', ctrl.adminGetDeliveryPartner);
router.post('/delivery-partners/:id/approve', ctrl.approveDeliveryPartner);
router.post('/delivery-partners/:id/reject', validate(rejectVendorSchema), ctrl.rejectDeliveryPartner);
router.post('/delivery-partners/:id/suspend', ctrl.suspendDeliveryPartner);
router.post('/delivery-partners/:id/reactivate', ctrl.reactivateDeliveryPartner);
router.patch('/delivery-partners/:id', validate(updateDeliveryPartnerSchema), ctrl.adminUpdateDeliveryPartner);
router.delete('/delivery-partners/:id', ctrl.adminDeleteDeliveryPartner);

// Orders + rentals
router.get('/orders', ctrl.adminListOrders);
router.get('/rentals', ctrl.adminListRentals);

// Payments
router.get('/payments', ctrl.adminListPayments);
router.get('/payments/summary', ctrl.adminPaymentsSummary);

// Notifications
router.post('/notifications/broadcast', validate(broadcastNotificationSchema), ctrl.adminBroadcastNotification);

// Settings
router.get('/settings', ctrl.adminGetSettings);
router.patch('/settings', validate(updateSettingsSchema), ctrl.adminUpdateSettings);
router.get('/rental-plans', ctrl.adminListRentalPlans);
router.put('/rental-plans', validate(rentalPlanSchema), ctrl.adminUpsertRentalPlan);
router.delete('/rental-plans/:id', ctrl.adminDeleteRentalPlan);

module.exports = router;
